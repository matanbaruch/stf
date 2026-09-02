#!/usr/bin/env bash
# Create one AVD per API level with the avdmanager currently at
# $ANDROID_HOME/cmdline-tools/latest, and print the resulting target= line.
# $1 is a label prefix ("old" / "new").
set +e
PREFIX="$1"
SDK="${ANDROID_HOME:-/usr/local/lib/android/sdk}"
AVDM="$SDK/cmdline-tools/latest/bin/avdmanager"
AVDH="${ANDROID_AVD_HOME:-$HOME/.android/avd}"
mkdir -p "$AVDH"

echo "avdmanager : $AVDM"
echo "revision   : $(grep -m1 '^Pkg.Revision' "$SDK/cmdline-tools/latest/source.properties" 2>/dev/null)"
echo "AVD home   : $AVDH"

for spec in "371:system-images;android-37.1;google_apis_ps16k;x86_64" \
            "36:system-images;android-36;default;x86_64"; do
  lvl="${spec%%:*}"; pkg="${spec#*:}"
  name="${PREFIX}-${lvl}"
  echo "================ $name  <-  $pkg ================"
  # Full output, no truncation: a silent failure here is the whole question.
  echo no | "$AVDM" create avd --force -n "$name" --package "$pkg" 2>&1 \
    | grep -viE '^\[=+ *\] *[0-9]+%|^Loading local repository|^Fetch remote repository'
  echo "avdmanager exit: ${PIPESTATUS[1]}"
  echo "--- files created ---"
  ls -la "$AVDH" 2>&1 | grep -iE "$name" || echo "  (nothing matching $name)"
  for f in "$AVDH/$name.ini" "$AVDH/$name.avd/config.ini"; do
    if [ -f "$f" ]; then
      echo "--- $f ---"
      grep -E '^target=|^image\.sysdir\.1=|^AvdId=|^abi\.type=|^tag\.id=|^hw\.gpu' "$f" 2>/dev/null
    else
      echo "--- $f : MISSING ---"
    fi
  done
done
echo "=== avdmanager list avd ==="
"$AVDM" list avd 2>&1 | grep -E 'Name:|Path:|Target:|Based on' | head -20
exit 0
