#!/usr/bin/env bash
#
# Throwaway diagnostic. Boots are already done by the runner action; this just
# records whether SurfaceFlinger aborted on the hasReadColorBufferDma assertion.
# Never exits non-zero: a leg that reports "no data" would be indistinguishable
# from a leg that reported "no abort".
#
set +e

OUT=out
mkdir -p "$OUT"

note() { echo "=== $* ==="; }

note "leg $LEG_ID  api=$LEG_API gpu=$LEG_GPU emulator-build=${LEG_EMUBUILD:-<default>}"

# Which host emulator binary actually ran. This is the whole point of the
# emulator-build knob, so record it rather than trusting the input.
"${ANDROID_HOME:-/usr/local/lib/android/sdk}/emulator/emulator" -version 2>&1 \
  | head -3 > "$OUT/emulator-version.txt"
cat "$OUT/emulator-version.txt"

adb wait-for-device

BOOT=no
for _ in $(seq 1 120); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
    BOOT=yes
    break
  fi
  sleep 5
done
note "sys.boot_completed reached: $BOOT"

# Let SurfaceFlinger settle so a crashloop gets a chance to show repeats.
sleep 60

adb shell getprop ro.build.id      2>/dev/null | tr -d '\r' > "$OUT/guest-build-id.txt"
adb shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r' > "$OUT/guest-sdk.txt"
adb shell getprop | tr -d '\r' > "$OUT/getprop.txt" 2>&1

adb logcat -d          > "$OUT/logcat.txt"       2>&1
adb logcat -d -b crash > "$OUT/logcat-crash.txt" 2>&1

count() { grep -acF -- "$1" "$OUT/logcat.txt" "$OUT/logcat-crash.txt" 2>/dev/null | awk -F: '{s+=$2} END{print s+0}'; }
countre() { grep -acE -- "$1" "$OUT/logcat.txt" 2>/dev/null | awk -F: '{s+=$2} END{print s+0}'; }

DMA=$(count 'hasReadColorBufferDma')
ABORTMSG=$(count 'Abort message')
SFSTART=$(countre "starting service 'surfaceflinger'")
SFSIG=$(countre "Service 'surfaceflinger'.*(received signal|SIGABRT|signal 6)")
SFDIED=$(countre "surfaceflinger.*(died|SIGABRT|signal 6)")
DER=$(count 'DisplayEventReceiver')

note "counts"
printf 'hasReadColorBufferDma        %s\n' "$DMA"
printf 'Abort message                %s\n' "$ABORTMSG"
printf "starting service sf          %s\n" "$SFSTART"
printf "sf received signal           %s\n" "$SFSIG"
printf "sf died/sigabrt (any)        %s\n" "$SFDIED"
printf 'DisplayEventReceiver         %s\n' "$DER"

if adb shell dumpsys SurfaceFlinger > "$OUT/dumpsys-sf.txt" 2>&1 && \
   [ -s "$OUT/dumpsys-sf.txt" ] && \
   ! grep -qiE "^(Can't find service|Failure)" "$OUT/dumpsys-sf.txt"; then
  DUMPSYS=ok
else
  DUMPSYS=fail
fi
note "dumpsys SurfaceFlinger: $DUMPSYS"
head -12 "$OUT/dumpsys-sf.txt" 2>/dev/null

# The decisive abort, quoted verbatim if present.
grep -m1 -A12 'hasReadColorBufferDma' "$OUT/logcat.txt" "$OUT/logcat-crash.txt" 2>/dev/null \
  | head -20 > "$OUT/abort-excerpt.txt"

cat > "$OUT/result.json" <<JSON
{
  "id": "$LEG_ID",
  "api": "$LEG_API",
  "gpu": "$LEG_GPU",
  "emulator_build_input": "${LEG_EMUBUILD:-default}",
  "emulator_version": "$(head -1 "$OUT/emulator-version.txt" | tr -d '"' | tr -d '\r')",
  "guest_build_id": "$(cat "$OUT/guest-build-id.txt")",
  "guest_sdk": "$(cat "$OUT/guest-sdk.txt")",
  "boot_completed": "$BOOT",
  "has_read_color_buffer_dma": $DMA,
  "abort_message": $ABORTMSG,
  "sf_starting": $SFSTART,
  "sf_received_signal": $SFSIG,
  "sf_died_any": $SFDIED,
  "display_event_receiver": $DER,
  "dumpsys_surfaceflinger": "$DUMPSYS"
}
JSON
note "result.json"
cat "$OUT/result.json"

gzip -f "$OUT/logcat.txt" 2>/dev/null || true
exit 0
