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

## Graph for thesis

Use `results/exp1/summary.csv`:

- X-axis: `dataset_size`
- Y-axis: `median_sec` (or `mean_sec`)

Used an XY scatter chart so X values are numeric (`25, 50, 100, 200, 400`).
