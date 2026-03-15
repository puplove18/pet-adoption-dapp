# Latency Test Datasets and How I Ran

This folder (`pet_data`) contains the dataset files used for the dataset-size latency test

## Dataset files

- `pets25.json`
- `pets50.json`
- `pets100.json`
- `pets200.json`
- `pets400.json`

Each file is imported into the blockchain with the same deployment flow, and the import duration is recorded from logs.

## What script uses these files

`../deploy_latency.sh` supports selecting the dataset by environment variable:

- `PET_DATA_FILE`

If not provided, it defaults to `../pet_data/pets200.json`

## Important workflow note

- Batch run loops create `.log` files only.
- `processed_tx_success` is **not** written during the run loop unless you explicitly query Prometheus and save to CSV.
- If you run Prometheus extraction much later, old data can be missing (for example after teardown/pruning/restarts).

## Run all dataset sizes (3 runs each)

From the `petadopt` directory:

```bash
mkdir -p results/exp1

for n in 25 50 100 200 400; do
  for r in 1 2 3; do
    ./teardown.sh >/dev/null 2>&1 || true
    PET_DATA_FILE="../pet_data/pets${n}.json" ./deploy_latency.sh > "results/exp1/N${n}_run0${r}.log" 2>&1 || true
  done
done
```

Notes:

- Output is redirected to files so batch runs do not block in terminal.
- One log file is created per run in `results/exp1/`.
- This loop does **not** write `processed_tx_success`; run the Prometheus extraction section afterward.

To monitor the footstep of the current run in real time:

```bash
tail -f results/exp1/N400_run03.log
```
Make sure to adjust the filename to match the run you want to monitor.

## Extract import durations from logs

```bash
grep -H "IMPORT_DURATION_SEC" results/exp1/N25_run01.log
```
Make sure to adjust the filename to match the log you want to extract from.

## Build CSV files

Create `durations.csv`:

```bash
echo "dataset_size,run,import_duration_sec" > results/exp1/durations.csv
for f in results/exp1/N*_run*.log; do
  n=$(basename "$f" | sed -E 's/^N([0-9]+)_run[0-9]+\.log$/\1/')
  r=$(basename "$f" | sed -E 's/^N[0-9]+_run0?([0-9]+)\.log$/\1/')
  d=$(grep -m1 "IMPORT_DURATION_SEC" "$f" | awk '{print $2}')
  echo "$n,$r,$d" >> results/exp1/durations.csv
done
```

Create sorted CSV:

```bash
{
  head -n 1 results/exp1/durations.csv
  tail -n +2 results/exp1/durations.csv | sort -t, -k1,1n -k2,2n
} > results/exp1/durations_sorted.csv
```

Create summary CSV (mean and median):

```bash
echo "dataset_size,mean_sec,median_sec" > results/exp1/summary.csv
for n in 25 50 100 200 400; do
  mean=$(awk -F, -v n="$n" '$1==n{s+=$3;c++} END{if(c) printf "%.3f", s/c}' results/exp1/durations.csv)
  median=$(awk -F, -v n="$n" '$1==n{print $3}' results/exp1/durations.csv | sort -n | awk '{a[NR]=$1} END{if(NR%2) printf "%.3f", a[(NR+1)/2]; else printf "%.3f", (a[NR/2]+a[NR/2+1])/2}')
  echo "$n,$mean,$median" >> results/exp1/summary.csv
done
```

## Add Prometheus processed transaction count

Transaction count is a workload sanity check to validate fairness of runs and dataset sizes.  
Create `with_prometheus.csv` by combining run logs and Prometheus API results:

```bash
echo "dataset_size,run,import_duration_sec,processed_tx_success" > results/exp1/with_prometheus.csv

for f in results/exp1/N*_run*.log; do
  n=$(basename "$f" | sed -E 's/^N([0-9]+)_run[0-9]+\.log$/\1/')
  r=$(basename "$f" | sed -E 's/^N[0-9]+_run0?([0-9]+)\.log$/\1/')
  start=$(grep -m1 'IMPORT_START' "$f" | awk '{print $2}')
  end=$(grep -m1 'IMPORT_END' "$f" | awk '{print $2}')
  dur=$(grep -m1 'IMPORT_DURATION_SEC' "$f" | awk '{print $2}')

  start_ts=$(date -d "$start" +%s)
  end_ts=$(date -d "$end" +%s)
  win=$((end_ts-start_ts))

  tx=$(curl -sG 'http://localhost:9090/api/v1/query' \
    --data-urlencode "query=sum(increase(broadcast_processed_count{channel=\"mychannel\",status=\"SUCCESS\",type=\"ENDORSER_TRANSACTION\"}[${win}s]))" \
    --data-urlencode "time=$end_ts" | jq -r '.data.result[0].value[1] // "NaN"')

  echo "$n,$r,$dur,$tx" >> results/exp1/with_prometheus.csv
done
```

Sort it:

```bash
{
  head -n 1 results/exp1/with_prometheus.csv
  tail -n +2 results/exp1/with_prometheus.csv | sort -t, -k1,1n -k2,2n
} > results/exp1/with_prometheus_sorted.csv
```

Create combined summary with the tx count and durations:

```bash
echo "dataset_size,duration_mean_sec,duration_median_sec,tx_mean,tx_median" > results/exp1/summary_with_prometheus.csv

for n in 25 50 100 200 400; do
  d_mean=$(awk -F, -v n="$n" '$1==n{s+=$3;c++} END{if(c) printf "%.3f", s/c}' results/exp1/with_prometheus_sorted.csv)
  d_med=$(awk -F, -v n="$n" '$1==n{print $3}' results/exp1/with_prometheus_sorted.csv | sort -n | awk '{a[NR]=$1} END{if(NR%2) printf "%.3f", a[(NR+1)/2]; else printf "%.3f", (a[NR/2]+a[NR/2+1])/2}')
  t_mean=$(awk -F, -v n="$n" '$1==n{s+=$4;c++} END{if(c) printf "%.3f", s/c}' results/exp1/with_prometheus_sorted.csv)
  t_med=$(awk -F, -v n="$n" '$1==n{print $4}' results/exp1/with_prometheus_sorted.csv | sort -n | awk '{a[NR]=$1} END{if(NR%2) printf "%.3f", a[(NR+1)/2]; else printf "%.3f", (a[NR/2]+a[NR/2+1])/2}')
  echo "$n,$d_mean,$d_med,$t_mean,$t_med" >> results/exp1/summary_with_prometheus.csv
done
```

## Graph for thesis

Use `results/exp1/summary_with_prometheus.csv`:

- X-axis: `dataset_size`
- Y-axis: `median_sec` (or `mean_sec`)

Used an XY scatter chart so X values are numeric (`25, 50, 100, 200, 400`).

## Experiment 2 (Block Policy): MaxMessageCount vs Latency

This is the second experiment with fixed input size (`pets200.json`) and variable block cutting policy:

- `MaxMessageCount = 1, 5, 10, 20, 40, 80`
- 3 runs per setting
- same deployment flow as `exp1`

### Run all MaxMessageCount settings (3 runs each)

From `petadopt` directory:

```bash
mkdir -p results/exp2

for m in 1 5 10 20 40 80; do
  sed -i -E "s/(MaxMessageCount:\s*).*/\1${m}/" ../hyperledger/fabric-samples/test-network/configtx/configtx.yaml
  for r in 1 2 3; do
    ./teardown.sh >/dev/null 2>&1 || true
    PET_DATA_FILE="../pet_data/pets200.json" ./deploy_latency.sh > "results/exp2/M${m}_run0${r}.log" 2>&1 || true
  done
done
```

Note:
- This loop does **not** write `processed_tx_success`; run the Prometheus extraction section afterward.

Optional: restore default after experiment:

```bash
sed -i -E 's/(MaxMessageCount:\s*).*/\110/' ../hyperledger/fabric-samples/test-network/configtx/configtx.yaml
```

### Build CSV files for exp2

Create `durations.csv`:

```bash
echo "max_message_count,run,import_duration_sec" > results/exp2/durations.csv
for f in results/exp2/M*_run*.log; do
  m=$(basename "$f" | sed -E 's/^M([0-9]+)_run[0-9]+\.log$/\1/')
  r=$(basename "$f" | sed -E 's/^M[0-9]+_run0?([0-9]+)\.log$/\1/')
  d=$(grep -m1 "IMPORT_DURATION_SEC" "$f" | awk '{print $2}')
  echo "$m,$r,$d" >> results/exp2/durations.csv
done
```

Create sorted CSV:

```bash
{
  head -n 1 results/exp2/durations.csv
  tail -n +2 results/exp2/durations.csv | sort -t, -k1,1n -k2,2n
} > results/exp2/durations_sorted.csv
```

Create summary CSV (mean and median):

```bash
echo "max_message_count,mean_sec,median_sec" > results/exp2/summary.csv
for m in 1 5 10 20 40 80; do
  mean=$(awk -F, -v m="$m" '$1==m{s+=$3;c++} END{if(c) printf "%.3f", s/c}' results/exp2/durations.csv)
  median=$(awk -F, -v m="$m" '$1==m{print $3}' results/exp2/durations.csv | sort -n | awk '{a[NR]=$1} END{if(NR%2) printf "%.3f", a[(NR+1)/2]; else printf "%.3f", (a[NR/2]+a[NR/2+1])/2}')
  echo "$m,$mean,$median" >> results/exp2/summary.csv
done
```

### Throughput from workload size (derived)

Fixed workload in exp2 is `200` submitted records:

```bash
echo "max_message_count,mean_sec,median_sec,median_tx_per_sec" > results/exp2/summary_with_tps.csv
tail -n +2 results/exp2/summary.csv | while IFS=, read -r m mean med; do
  tps=$(awk -v d="$med" 'BEGIN{if(d>0) printf "%.3f", 200/d; else print "NaN"}')
  echo "$m,$mean,$med,$tps" >> results/exp2/summary_with_tps.csv
done
```

### Prometheus processed transaction count (exp2)

To get `processed_tx_success` like `exp1`, query Prometheus for each run window:

```bash
echo "max_message_count,run,import_duration_sec,processed_tx_success" > results/exp2/with_prometheus.csv

for f in results/exp2/M*_run*.log; do
  m=$(basename "$f" | sed -E 's/^M([0-9]+)_run[0-9]+\.log$/\1/')
  r=$(basename "$f" | sed -E 's/^M[0-9]+_run0?([0-9]+)\.log$/\1/')
  start=$(grep -m1 'IMPORT_START' "$f" | awk '{print $2}')
  end=$(grep -m1 'IMPORT_END' "$f" | awk '{print $2}')
  dur=$(grep -m1 'IMPORT_DURATION_SEC' "$f" | awk '{print $2}')

  start_ts=$(date -d "$start" +%s)
  end_ts=$(date -d "$end" +%s)
  win=$((end_ts-start_ts))

  tx=$(curl -sG 'http://localhost:9090/api/v1/query' \
    --data-urlencode "query=sum(increase(broadcast_processed_count{channel=\"mychannel\",status=\"SUCCESS\",type=\"ENDORSER_TRANSACTION\"}[${win}s]))" \
    --data-urlencode "time=$end_ts" | jq -r '.data.result[0].value[1] // "NaN"')

  echo "$m,$r,$dur,$tx" >> results/exp2/with_prometheus.csv
done
```

Sort it:

```bash
{
  head -n 1 results/exp2/with_prometheus.csv
  tail -n +2 results/exp2/with_prometheus.csv | sort -t, -k1,1n -k2,2n
} > results/exp2/with_prometheus_sorted.csv
```

Important:
- Prometheus must be reachable at `localhost:9090` when you run the query.
- If history was pruned or containers restarted, some old runs may return `NaN`.

### Recommended exp2 command (run + Prometheus capture in one batch)

Use this if you want to avoid missing Prometheus history:

```bash
cd /home/jurikasai18/Documents/TYP/petadopt
mkdir -p results/exp2

echo "max_message_count,run,import_duration_sec,processed_tx_success" > results/exp2/with_prometheus.csv
echo "max_message_count,run,import_duration_sec" > results/exp2/durations.csv

for m in 1 5 10 20 40 80; do
  sed -i -E "s/(MaxMessageCount:\s*).*/\1${m}/" ../hyperledger/fabric-samples/test-network/configtx/configtx.yaml
  for r in 1 2 3; do
    ./teardown.sh >/dev/null 2>&1 || true

    log="results/exp2/M${m}_run0${r}.log"
    PET_DATA_FILE="../pet_data/pets200.json" ./deploy_latency.sh > "$log" 2>&1 || true

    start=$(grep -m1 'IMPORT_START' "$log" | awk '{print $2}')
    end=$(grep -m1 'IMPORT_END' "$log" | awk '{print $2}')
    dur=$(grep -m1 'IMPORT_DURATION_SEC' "$log" | awk '{print $2}')

    start_ts=$(date -d "$start" +%s)
    end_ts=$(date -d "$end" +%s)
    win=$((end_ts-start_ts))

    tx=$(curl -sG 'http://localhost:9090/api/v1/query' \
      --data-urlencode "query=sum(increase(broadcast_processed_count{channel=\"mychannel\",status=\"SUCCESS\",type=\"ENDORSER_TRANSACTION\"}[${win}s]))" \
      --data-urlencode "time=$end_ts" | jq -r '.data.result[0].value[1] // "NaN"')

    echo "$m,$r,$dur" >> results/exp2/durations.csv
    echo "$m,$r,$dur,$tx" >> results/exp2/with_prometheus.csv
  done
done

{ head -n1 results/exp2/durations.csv; tail -n+2 results/exp2/durations.csv | sort -t, -k1,1n -k2,2n; } > results/exp2/durations_sorted.csv
{ head -n1 results/exp2/with_prometheus.csv; tail -n+2 results/exp2/with_prometheus.csv | sort -t, -k1,1n -k2,2n; } > results/exp2/with_prometheus_sorted.csv
```

### Graph for exp2 thesis figure

Use `results/exp2/summary_with_tps.csv` or `results/exp2/summary.csv`:

- X-axis: `max_message_count`
- Y-axis: `median_sec` (and optionally a second chart for `median_tx_per_sec`)

Use XY scatter chart so X values remain numeric.
