/* ═══════════════════════════════════════════════════════
   LANNAH WORKSPACE — Metadata Rewrite Web Worker
   Runs off the main thread so the UI never freezes,
   even on large 4K files sent through Telegram.
═══════════════════════════════════════════════════════ */

self.onmessage = async function (e) {
  const { buf, opts, newName } = e.data;

  try {
    postMessage({ type: 'progress', p: 10, label: 'Reading file…' });

    const ext = newName.split('.').pop().toLowerCase();
    let outBuf;

    if (['mp4', 'mov', 'm4v', '3gp', '3g2'].includes(ext)) {
      postMessage({ type: 'progress', p: 30, label: 'Scanning metadata structure…' });
      outBuf = patchMp4(buf, opts);
    } else {
      // Non-MP4: pass bytes through unchanged, new filename is enough
      outBuf = buf;
    }

    postMessage({ type: 'progress', p: 85, label: 'Building output file…' });

    // Transfer the buffer back — zero copy, no clone overhead
    postMessage({ type: 'done', outBuf, newName }, [outBuf]);

  } catch (err) {
    postMessage({ type: 'error', message: err.message });
  }
};

/* ── MP4/MOV box patcher ──────────────────────────────── */
function patchMp4(buf, opts) {
  const out = new Uint8Array(buf.slice(0));
  const outView = new DataView(out.buffer);

  let offset = 0;
  while (offset < out.byteLength - 8) {
    const size = outView.getUint32(offset);
    if (size < 8) break;
    const type = boxType(out, offset + 4);
    if (type === 'moov') patchBox(out, outView, offset + 8, offset + size, opts);
    offset += size;
  }
  return out.buffer;
}

function patchBox(out, outView, start, end, opts) {
  let offset = start;
  while (offset < end - 8) {
    const size = outView.getUint32(offset);
    if (size < 8 || offset + size > end) break;
    const type = boxType(out, offset + 4);

    if (type === 'udta') {
      // Wipe user-data box — title, GPS, device, encoder all live here
      zeroRange(out, offset + 8, offset + size);
    } else if (type === 'mvhd' && opts.date) {
      // Patch creation_time & modification_time (version 0 = 32-bit timestamps)
      const ver = out[offset + 8];
      if (ver === 0) {
        const rnd = (Math.floor(Date.now() / 1000) -
          Math.floor(Math.random() * 60 * 60 * 24 * 600) +
          2082844800) >>> 0;
        outView.setUint32(offset + 12, rnd);
        outView.setUint32(offset + 16, rnd);
      }
    } else if (['trak','mdia','minf','stbl','meta','ilst','udta'].includes(type)) {
      patchBox(out, outView, offset + 8, offset + size, opts);
    }
    offset += size;
  }
}

function boxType(arr, offset) {
  return String.fromCharCode(arr[offset], arr[offset+1], arr[offset+2], arr[offset+3]);
}

function zeroRange(arr, from, to) {
  arr.fill(0, from, to);  // fill() is ~5× faster than a for-loop for large ranges
}
