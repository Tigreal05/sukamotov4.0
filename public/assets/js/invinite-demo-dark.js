// Fitur Otomatis Nama Tamu dari Link (?to=Nama)
const urlParams = new URLSearchParams(window.location.search);
const nama = urlParams.get('to');
if (nama) {
  document.getElementById('namaTamu').innerText = nama;
}

