#!/usr/bin/env bash
# Build the two media executables from the source shipped with the release.
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
work="$root/.build/media"
prefix="$work/prefix"
mkdir -p "$work/source" "$prefix" "$root/release"
fetch_source() {
  local name="$1" url="$2"
  if [[ ! -f "$work/source/$name.tar.gz" ]]; then
    curl --fail --location --retry 3 "$url" -o "$work/source/$name.tar.gz"
  fi
  mkdir -p "$work/$name"
  tar -xzf "$work/source/$name.tar.gz" --strip-components=1 -C "$work/$name"
}
fetch_source ffmpeg https://github.com/FFmpeg/FFmpeg/archive/refs/tags/n6.1.1.tar.gz
fetch_source x264 https://github.com/mirror/x264/archive/31e19f92f00c7003fa115047ce50978bc98c3a0d.tar.gz
fetch_source zlib https://github.com/madler/zlib/archive/refs/tags/v1.3.1.tar.gz
export PKG_CONFIG_PATH="$prefix/lib/pkgconfig"
export PKG_CONFIG_LIBDIR="$prefix/lib/pkgconfig"
export CFLAGS="-O2 -I$prefix/include"
export LDFLAGS="-L$prefix/lib"
platform="$(uname -s)"
threads=3
extra=()
x264_extra=()
if [[ "$platform" == Darwin ]]; then
  export CC=clang
  export MACOSX_DEPLOYMENT_TARGET=14.2
  label=Mac-arm64
else
  export CC=gcc
  export LDFLAGS="$LDFLAGS -static -static-libgcc"
  extra=(--target-os=mingw32 --arch=x86_64)
  x264_extra=(--host=x86_64-w64-mingw32 --enable-win32thread)
  label=Windows-x64
fi
(cd "$work/zlib" && ./configure --static --prefix="$prefix" && make -j "$threads" && make install)
(cd "$work/x264" && ./configure --prefix="$prefix" --enable-static --disable-cli --disable-opencl --enable-pic "${x264_extra[@]}" && make -j "$threads" && make install)
(cd "$work/ffmpeg" && ./configure --prefix="$prefix" --disable-autodetect --disable-network --disable-doc --disable-debug --disable-ffplay --enable-gpl --enable-libx264 --enable-zlib --enable-static --disable-shared --pkg-config-flags=--static --extra-cflags="$CFLAGS" --extra-ldflags="$LDFLAGS" "${extra[@]}" && make -j "$threads" && make install)
cp "$root/scripts/build-media.sh" "$work/source/"
cp "$work/ffmpeg/ffbuild/config.log" "$work/source/ffmpeg-config.log"
cp "$work/ffmpeg/ffbuild/config.mak" "$work/source/ffmpeg-config.mak"
cp "$work/x264/config.mak" "$work/source/x264-config.mak"
cp "$work/ffmpeg/COPYING.GPLv2" "$work/source/FFmpeg-COPYING.GPLv2"
cp "$work/x264/COPYING" "$work/source/x264-COPYING"
cp "$work/zlib/LICENSE" "$work/source/zlib-LICENSE"
"$CC" --version > "$work/source/compiler.txt"
"$prefix/bin/ffmpeg" -version > "$work/source/ffmpeg-version.txt"
"$prefix/bin/ffprobe" -version > "$work/source/ffprobe-version.txt"
cat > "$work/source/README.txt" <<'TEXT'
ClearTake media-tool corresponding source

These archives contain the complete unmodified FFmpeg, x264 and zlib source
used to build the FFmpeg and FFprobe executables in this platform's app.
The included build-media.sh contains download URLs and build commands;
config logs and compiler/version output identify this build.

Rebuild: place build-media.sh in scripts/ in a new directory and run it
from a native Apple Silicon Mac with Xcode command-line tools, make and
pkg-config, or Windows MSYS2 MINGW64 with gcc, make, nasm and pkgconf.
For offline builds, first copy these *.tar.gz archives into .build/media/source/.
The resulting executables are written to .build/media/prefix/bin/.
FFmpeg and x264 are GPLv2-or-later; zlib retains its zlib license.
TEXT
tar -czf "$root/release/ClearTake-Media-Source-$label.tar.gz" -C "$work" source
