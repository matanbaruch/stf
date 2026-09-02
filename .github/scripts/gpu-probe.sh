#!/usr/bin/env bash
#
# Throwaway diagnostic. The runner action has already booted (or failed to boot)
# the emulator; this records whether SurfaceFlinger aborted on
#   Assertion failed: !rcEnc->featureInfo()->hasReadColorBufferDma
# Never exits non-zero: a leg reporting "no data" must not look like "no abort".
#
set +e

OUT=out
mkdir -p "$OUT"
SDK="${ANDROID_HOME:-/usr/local/lib/android/sdk}"

note() { echo "=== $* ==="; }

note "leg $LEG_ID api=$LEG_API target=$LEG_TARGET gpu=$LEG_GPU extra=[${LEG_EXTRA:-none}]"

# Which emulator package is installed. `emulator -version` cannot be used: the
# qemu binary needs libpulse.so.0, which the runner image does not have.
grep -E '^Pkg.Revision|^Pkg.Desc' "$SDK/emulator/source.properties" 2>/dev/null \
  > "$OUT/emulator-pkg.txt"
cat "$OUT/emulator-pkg.txt"

# The shipped defaults, so the report can show GLDMA's default state rather than
# asserting it. -feature on the command line overrides these at runtime.
cp "$SDK/emulator/lib/advancedFeatures.ini" "$OUT/advancedFeatures.ini" 2>/dev/null
note "advancedFeatures.ini GLDMA defaults"
grep -iE '^ *GLDMA' "$OUT/advancedFeatures.ini" 2>/dev/null || echo "  (no GLDMA lines found)"

# Prove which cmdline-tools built the AVD and what target= it got. This is the
# whole point of the fixed-tools run: target=android-0 means old tools won.
for d in "$SDK"/cmdline-tools/*/; do
  printf 'cmdline-tools %-56s %s\n' "$d" "$(grep -m1 '^Pkg.Revision' "$d/source.properties" 2>/dev/null)"
done | tee "$OUT/cmdline-tools.txt"
AVDH="${ANDROID_AVD_HOME:-$HOME/.android/avd}"
for f in "$AVDH"/*.ini; do
  [ -f "$f" ] || continue
  echo "--- $f ---"
  grep -E '^target=|^path=' "$f" 2>/dev/null
done | tee "$OUT/avd-ini.txt"
AVD_TARGET="$(grep -hm1 '^target=' "$AVDH"/*.ini 2>/dev/null | cut -d= -f2)"
note "AVD target = ${AVD_TARGET:-<unknown>}"

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

# Let a crashloop show repeats rather than catching only the first abort.
sleep 60

adb shell getprop ro.build.id              2>/dev/null | tr -d '\r' > "$OUT/guest-build-id.txt"
adb shell getprop ro.build.version.sdk     2>/dev/null | tr -d '\r' > "$OUT/guest-sdk.txt"
adb shell getprop ro.product.cpu.abi       2>/dev/null | tr -d '\r' > "$OUT/guest-abi.txt"
# 16 KB page size images report a 16384 page size; proves which variant booted.
adb shell getconf PAGE_SIZE                2>/dev/null | tr -d '\r' > "$OUT/guest-page-size.txt"
adb shell getprop 2>&1 | tr -d '\r'                                 > "$OUT/getprop.txt"

adb logcat -d          > "$OUT/logcat.txt"       2>&1
adb logcat -d -b crash > "$OUT/logcat-crash.txt" 2>&1

# Count over the concatenation. The previous version ran `grep -c` on a single
# file, which prints a bare number with no "file:" prefix, so an `awk -F:` sum
# over $2 silently produced 0 for every single-file counter.
cat_logs() { cat "$OUT/logcat.txt" "$OUT/logcat-crash.txt" 2>/dev/null; }
cnt()   { cat_logs | grep -cF -- "$1"; }
cntre() { cat_logs | grep -cE -- "$1"; }

DMA=$(cnt 'hasReadColorBufferDma')
ABORTMSG=$(cnt 'Abort message')
SFSTART=$(cntre "starting service 'surfaceflinger'")
SFSIG=$(cntre "Service 'surfaceflinger'.*(received signal|SIGABRT|signal 6)")
DER=$(cnt 'DisplayEventReceiver')

# Guest-side view of the host feature set, if the goldfish encoder logs it.
cat_logs | grep -iE 'GLDMA|ColorBufferDma|rcEnc|featureInfo' | head -40 \
  > "$OUT/guest-feature-lines.txt"

note "counts"
printf 'hasReadColorBufferDma   %s\n' "$DMA"
printf 'Abort message           %s\n' "$ABORTMSG"
printf 'sf starting             %s\n' "$SFSTART"
printf 'sf received signal      %s\n' "$SFSIG"
printf 'DisplayEventReceiver    %s\n' "$DER"

if adb shell dumpsys SurfaceFlinger > "$OUT/dumpsys-sf.txt" 2>&1 && \
   [ -s "$OUT/dumpsys-sf.txt" ] && \
   ! grep -qiE "^(Can't find service|Failure)" "$OUT/dumpsys-sf.txt"; then
  DUMPSYS=ok
else
  DUMPSYS=fail
fi
note "dumpsys SurfaceFlinger: $DUMPSYS (answered at sample time; NOT proof it stayed up)"

cat_logs | grep -m1 -A12 'hasReadColorBufferDma' > "$OUT/abort-excerpt.txt" 2>/dev/null

cat > "$OUT/result.json" <<JSON
{
  "id": "$LEG_ID",
  "api": "$LEG_API",
  "target": "$LEG_TARGET",
  "gpu": "$LEG_GPU",
  "extra_opts": "${LEG_EXTRA:-none}",
  "emulator_pkg_revision": "$(grep -E '^Pkg.Revision' "$OUT/emulator-pkg.txt" 2>/dev/null | cut -d= -f2)",
  "guest_build_id": "$(cat "$OUT/guest-build-id.txt" 2>/dev/null)",
  "guest_sdk": "$(cat "$OUT/guest-sdk.txt" 2>/dev/null)",
  "guest_page_size": "$(cat "$OUT/guest-page-size.txt" 2>/dev/null)",
  "boot_completed": "$BOOT",
  "has_read_color_buffer_dma": ${DMA:-0},
  "abort_message": ${ABORTMSG:-0},
  "sf_starting": ${SFSTART:-0},
  "sf_received_signal": ${SFSIG:-0},
  "display_event_receiver": ${DER:-0},
  "dumpsys_surfaceflinger": "$DUMPSYS",
  "avd_target": "${AVD_TARGET:-unknown}",
  "cmdline_tools": "$(grep -m1 "^Pkg.Revision" "$SDK/cmdline-tools/latest/source.properties" 2>/dev/null | cut -d= -f2)"
}
JSON
note "result.json"
cat "$OUT/result.json"

gzip -f "$OUT/logcat.txt" 2>/dev/null || true
exit 0
