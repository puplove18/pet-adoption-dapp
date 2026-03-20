#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_NETWORK="$PROJECT_ROOT/hyperledger/fabric-samples/test-network"
CONFIGTX_FILE="$TEST_NETWORK/configtx/configtx.yaml"

WORKLOAD_RECORDS="${WORKLOAD_RECORDS:-3000}"
RUNS_PER_SETTING="${RUNS_PER_SETTING:-1}"
M_VALUES="${M_VALUES:-200 400}"
RESULT_DIR="${RESULT_DIR:-results/exp2_probe_3000}"
DATA_FILE="${DATA_FILE:-../pet_data/pets${WORKLOAD_RECORDS}.json}"

if [[ "$RESULT_DIR" = /* ]]; then
  RESULT_DIR_ABS="$RESULT_DIR"
else
  RESULT_DIR_ABS="$SCRIPT_DIR/$RESULT_DIR"
fi

mkdir -p "$RESULT_DIR_ABS"

for cmd in docker node jq curl sed awk grep date; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Missing required command: $cmd"
    exit 1
  }
done

if [[ ! -f "$CONFIGTX_FILE" ]]; then
  echo "Missing configtx.yaml: $CONFIGTX_FILE"
  exit 1
fi

GEN_TARGET_LOCAL=""
if [[ "$DATA_FILE" =~ ^\.\./pet_data/(.+)$ ]]; then
  GEN_TARGET_LOCAL="$SCRIPT_DIR/pet_data/${BASH_REMATCH[1]}"
fi

if [[ -n "$GEN_TARGET_LOCAL" ]] && [[ ! -f "$GEN_TARGET_LOCAL" ]]; then
  echo "Generating $(basename "$GEN_TARGET_LOCAL") ..."
  (
    cd "$SCRIPT_DIR/pet_data"
    node dataGen.js "$WORKLOAD_RECORDS" "$(basename "$GEN_TARGET_LOCAL")"
  )
fi

BACKUP_CONFIGTX="$(mktemp "$SCRIPT_DIR/.configtx.yaml.backup.XXXXXX")"
cp "$CONFIGTX_FILE" "$BACKUP_CONFIGTX"

cleanup() {
  cp "$BACKUP_CONFIGTX" "$CONFIGTX_FILE"
  rm -f "$BACKUP_CONFIGTX"
}
trap cleanup EXIT

WITH_PROM_CSV="$RESULT_DIR_ABS/with_prometheus.csv"
if [[ ! -f "$WITH_PROM_CSV" ]]; then
  echo "max_message_count,run,import_duration_sec,processed_tx_success" > "$WITH_PROM_CSV"
fi

query_processed_tx() {
  local win="$1"
  local end_ts="$2"
  curl -sG 'http://localhost:9090/api/v1/query' \
    --data-urlencode "query=sum(increase(broadcast_processed_count{channel=\"mychannel\",status=\"SUCCESS\",type=\"ENDORSER_TRANSACTION\"}[${win}s]))" \
    --data-urlencode "time=$end_ts" \
    | jq -r '.data.result[0].value[1] // "NaN"'
}

echo "Starting exp2 probe run"
echo "Result dir: $RESULT_DIR_ABS"
echo "Workload records: $WORKLOAD_RECORDS"
echo "Data file for import script: $DATA_FILE"
echo "MaxMessageCount values: $M_VALUES"
echo "Runs per setting: $RUNS_PER_SETTING"

for m in $M_VALUES; do
  echo ""
  echo "=== MaxMessageCount=$m ==="
  sed -i -E "s/(MaxMessageCount:\s*).*/\1${m}/" "$CONFIGTX_FILE"

  for r in $(seq 1 "$RUNS_PER_SETTING"); do
    log_file="$RESULT_DIR_ABS/M${m}_run$(printf '%02d' "$r").log"
    if [[ -f "$log_file" ]] && grep -q "IMPORT_DURATION_SEC" "$log_file"; then
      echo "Skipping existing successful run: $(basename "$log_file")"
      continue
    fi

    echo "Running M=$m run=$r ..."
    (
      cd "$SCRIPT_DIR"
      ./teardown.sh >/dev/null 2>&1 || true
      PET_DATA_FILE="$DATA_FILE" ./deploy_latency.sh > "$log_file" 2>&1 || true
    )

    if ! grep -q "IMPORT_DURATION_SEC" "$log_file"; then
      echo "Run failed or incomplete (no IMPORT_DURATION_SEC): $(basename "$log_file")"
      continue
    fi

    start="$(grep -m1 'IMPORT_START' "$log_file" | awk '{print $2}')"
    end="$(grep -m1 'IMPORT_END' "$log_file" | awk '{print $2}')"
    dur="$(grep -m1 'IMPORT_DURATION_SEC' "$log_file" | awk '{print $2}')"

    if [[ -z "${start:-}" || -z "${end:-}" || -z "${dur:-}" ]]; then
      echo "Could not parse timing markers for $(basename "$log_file")"
      continue
    fi

    start_ts="$(date -d "$start" +%s)"
    end_ts="$(date -d "$end" +%s)"
    win=$((end_ts - start_ts))
    if (( win <= 0 )); then
      win=1
    fi

    tx="$(query_processed_tx "$win" "$end_ts")"
    sed -i -E "/^${m},${r},/d" "$WITH_PROM_CSV"
    echo "$m,$r,$dur,$tx" >> "$WITH_PROM_CSV"
    echo "Completed M=$m run=$r duration=$dur tx=$tx"
  done
done

echo "Building derived CSV outputs ..."

{
  echo "max_message_count,run,import_duration_sec"
  shopt -s nullglob
  for f in "$RESULT_DIR_ABS"/M*_run*.log; do
    m="$(basename "$f" | sed -E 's/^M([0-9]+)_run[0-9]+\.log$/\1/')"
    r="$(basename "$f" | sed -E 's/^M[0-9]+_run0?([0-9]+)\.log$/\1/')"
    d="$(grep -m1 "IMPORT_DURATION_SEC" "$f" | awk '{print $2}')"
    if [[ -n "${d:-}" ]]; then
      echo "$m,$r,$d"
    fi
  done
} > "$RESULT_DIR_ABS/durations.csv"

{
  head -n 1 "$RESULT_DIR_ABS/durations.csv"
  tail -n +2 "$RESULT_DIR_ABS/durations.csv" | sort -t, -k1,1n -k2,2n
} > "$RESULT_DIR_ABS/durations_sorted.csv"

{
  head -n 1 "$WITH_PROM_CSV"
  tail -n +2 "$WITH_PROM_CSV" | sort -t, -k1,1n -k2,2n
} > "$RESULT_DIR_ABS/with_prometheus_sorted.csv"

{
  echo "max_message_count,duration_mean_sec,duration_median_sec,tx_mean,tx_median"
  for m in $M_VALUES; do
    d_mean="$(awk -F, -v m="$m" '$1==m{s+=$3;c++} END{if(c) printf "%.3f", s/c; else print "NaN"}' "$RESULT_DIR_ABS/with_prometheus_sorted.csv")"
    d_med="$(awk -F, -v m="$m" '$1==m{print $3}' "$RESULT_DIR_ABS/with_prometheus_sorted.csv" | sort -n | awk '{a[NR]=$1} END{if(NR==0) print "NaN"; else if(NR%2) printf "%.3f", a[(NR+1)/2]; else printf "%.3f", (a[NR/2]+a[NR/2+1])/2}')"
    t_mean="$(awk -F, -v m="$m" '$1==m{s+=$4;c++} END{if(c) printf "%.3f", s/c; else print "NaN"}' "$RESULT_DIR_ABS/with_prometheus_sorted.csv")"
    t_med="$(awk -F, -v m="$m" '$1==m{print $4}' "$RESULT_DIR_ABS/with_prometheus_sorted.csv" | sort -n | awk '{a[NR]=$1} END{if(NR==0) print "NaN"; else if(NR%2) printf "%.3f", a[(NR+1)/2]; else printf "%.3f", (a[NR/2]+a[NR/2+1])/2}')"
    echo "$m,$d_mean,$d_med,$t_mean,$t_med"
  done
} > "$RESULT_DIR_ABS/summary_with_prometheus.csv"

{
  echo "max_message_count,duration_mean_sec,duration_median_sec,tx_mean,tx_median,derived_tx_per_sec,prom_tx_per_sec"
  tail -n +2 "$RESULT_DIR_ABS/summary_with_prometheus.csv" | while IFS=, read -r m dmean dmed tmean tmed; do
    derived="$(awk -v n="$WORKLOAD_RECORDS" -v d="$dmed" 'BEGIN{if(d+0>0) printf "%.3f", n/d; else print "NaN"}')"
    prom="$(awk -v t="$tmed" -v d="$dmed" 'BEGIN{if(d+0>0) printf "%.3f", t/d; else print "NaN"}')"
    echo "$m,$dmean,$dmed,$tmean,$tmed,$derived,$prom"
  done
} > "$RESULT_DIR_ABS/summary_with_prometheus_tps.csv"

echo ""
echo "Done. Key output files:"
echo "  $RESULT_DIR_ABS/with_prometheus_sorted.csv"
echo "  $RESULT_DIR_ABS/summary_with_prometheus.csv"
echo "  $RESULT_DIR_ABS/summary_with_prometheus_tps.csv"
