const errorStates = {
  400: {
    title: 'Permintaan tidak valid',
    message: 'Permintaan yang dikirim tidak dapat diproses. Periksa kembali alamat atau data yang kamu masukkan.',
  },
  403: {
    title: 'Akses tidak diizinkan',
    message: 'Kamu tidak memiliki izin untuk membuka halaman ini. Jika merasa ini keliru, silakan hubungi tim ISINDO.',
  },
  404: {
    title: 'Halaman tidak ditemukan',
    message: 'Halaman yang kamu cari mungkin sudah dipindahkan atau alamatnya tidak tepat.',
  },
  408: {
    title: 'Waktu permintaan habis',
    message: 'Koneksi membutuhkan waktu terlalu lama. Periksa jaringanmu, lalu coba muat halaman kembali.',
  },
  500: {
    title: 'Terjadi gangguan',
    message: 'Ada kendala pada layanan ISINDO. Coba kembali beberapa saat lagi.',
  },
  502: {
    title: 'Layanan belum tersambung',
    message: 'Server menerima respons yang tidak sesuai. Silakan coba kembali dalam beberapa saat.',
  },
  503: {
    title: 'Layanan sedang istirahat',
    message: 'Layanan sedang sibuk atau dalam pemeliharaan. Kami akan segera kembali.',
  },
  504: {
    title: 'Server tidak merespons',
    message: 'Server membutuhkan waktu terlalu lama untuk merespons. Silakan coba kembali.',
  },
}

const params = new URLSearchParams(window.location.search)
const requestedCode = Number(params.get('code') || params.get('status'))
const code = Object.hasOwn(errorStates, requestedCode) ? requestedCode : 404
const state = errorStates[code]

document.title = `${code} — ${state.title} | ISINDO 2026`
document.getElementById('errorCode').textContent = code
document.getElementById('errorTitle').textContent = state.title
document.getElementById('errorMessage').textContent = state.message
document.getElementById('errorRetry').addEventListener('click', () => window.location.reload())
