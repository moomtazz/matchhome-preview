(() => {
  'use strict';

  // Semua properti, foto, harga, biaya, pengembang, dan riwayat di sini adalah ilustrasi.
  // Tautan resmi hanya rujukan untuk persiapan mandiri, bukan bukti pemeriksaan.
  function createDocumentExamples(documentType, readiness) {
    const inProgress = readiness === 'Dalam pembangunan';
    return [
      {
        name: `Sertipikat ${documentType}`,
        status: 'Belum diperiksa',
        source: 'Data contoh prototipe',
        reviewer: '-',
        date: '-',
        note: 'Jenis sertipikat hanya ilustrasi. Minta salinan, cocokkan pemegang hak dan objeknya, lalu konsultasikan pemeriksaan dengan pihak berwenang.',
        officialUrl: 'https://www.atrbpn.go.id/'
      },
      {
        name: 'PBG',
        status: 'Belum diperiksa',
        source: 'Data contoh prototipe',
        reviewer: '-',
        date: '-',
        note: 'Tidak ada PBG nyata yang dilampirkan. Minta nomor dan salinan PBG serta cocokkan alamat, fungsi, dan luas bangunan.',
        officialUrl: 'https://perizinan.pu.go.id/portal/services/simbg'
      },
      {
        name: inProgress ? 'Progres lapangan' : 'SLF',
        status: inProgress ? 'Perlu klarifikasi' : 'Belum diperiksa',
        source: 'Data contoh prototipe',
        reviewer: '-',
        date: '-',
        note: inProgress
          ? 'Status pembangunan adalah ilustrasi, bukan hasil inspeksi. Minta jadwal penyelesaian tertulis dan lakukan kunjungan lapangan.'
          : 'Status siap huni adalah ilustrasi, bukan bukti kelaikan fungsi. Minta SLF dan konfirmasikan kondisi bangunan melalui kunjungan.',
        officialUrl: inProgress ? '' : 'https://perizinan.pu.go.id/portal/services/simbg'
      },
      {
        name: 'Identitas pengembang',
        status: 'Belum diperiksa',
        source: 'Data contoh prototipe',
        reviewer: '-',
        date: '-',
        note: 'Nama pengembang fiktif. Untuk penawaran nyata, minta identitas badan usaha dan cocokkan dengan pihak yang menandatangani perjanjian.',
        officialUrl: 'https://ahu.go.id/'
      }
    ];
  }

  function createTimelineExamples() {
    return [
      {
        date: '2026-11-10',
        title: 'Contoh: listing ditambahkan',
        detail: 'Contoh: pengelola memasukkan listing fiktif untuk demonstrasi. Tanggal ilustrasi ini bukan catatan pemasaran atau transaksi nyata.',
        actor: 'Pengelola demo'
      },
      {
        date: '2026-11-11',
        title: 'Contoh: daftar dokumen disusun',
        detail: 'Contoh: daftar pertanyaan dokumen ditambahkan tanpa pemeriksaan dokumen asli atau konfirmasi instansi. Tanggal hanya ilustrasi.',
        actor: 'Pengelola demo'
      },
      {
        date: '2026-11-12',
        title: 'Contoh: detail harga diperbarui',
        detail: 'Contoh: harga dan asumsi biaya bulanan diubah untuk demonstrasi riwayat. Bukan penawaran, pembayaran, atau transaksi nyata.',
        actor: 'Pengelola demo'
      }
    ];
  }

  const properties = [
    {
      id: 'taman-senja',
      name: 'Taman Senja Residence',
      city: 'Sidoarjo',
      district: 'Buduran',
      price: 580000000,
      beds: 3,
      baths: 2,
      building: 65,
      land: 90,
      type: 'Rumah',
      image: 'house-1',
      developer: 'PT Ruang Senja (contoh fiktif)',
      description: 'Listing fiktif rumah dua lantai dengan tiga kamar, ruang keluarga terbuka, dan halaman kecil. Foto, lokasi, spesifikasi, harga, serta biaya bulanan merupakan ilustrasi; bukan penawaran nyata.',
      amenities: ['Carport', 'Taman', 'Keamanan kawasan'],
      monthlyCosts: { utilities: 650000, management: 150000 },
      readiness: 'Siap huni',
      documentType: 'SHM',
      documents: createDocumentExamples('SHM', 'Siap huni'),
      timeline: createTimelineExamples()
    },
    {
      id: 'aruna',
      name: 'Aruna Living',
      city: 'Surabaya',
      district: 'Sambikerep',
      price: 875000000,
      beds: 3,
      baths: 2,
      building: 85,
      land: 105,
      type: 'Rumah',
      image: 'hero',
      developer: 'Aruna Properti (contoh fiktif)',
      description: 'Listing fiktif rumah tiga kamar dengan jendela lebar, ruang kerja, dan taman kawasan. Foto, lokasi, spesifikasi, harga, serta biaya bulanan merupakan ilustrasi; bukan penawaran nyata.',
      amenities: ['Carport', 'Ruang kerja', 'Taman kawasan'],
      monthlyCosts: { utilities: 800000, management: 250000 },
      readiness: 'Siap huni',
      documentType: 'SHM',
      documents: createDocumentExamples('SHM', 'Siap huni'),
      timeline: createTimelineExamples()
    },
    {
      id: 'bumi-asri',
      name: 'Bumi Asri Garden',
      city: 'Gresik',
      district: 'Menganti',
      price: 365000000,
      beds: 2,
      baths: 1,
      building: 36,
      land: 72,
      type: 'Rumah',
      image: 'house-2',
      developer: 'Bumi Asri Nusantara (contoh fiktif)',
      description: 'Listing fiktif rumah dua kamar dengan halaman belakang dan area bermain kawasan. Foto, lokasi, spesifikasi, harga, progres, serta biaya bulanan merupakan ilustrasi; bukan penawaran nyata.',
      amenities: ['Carport', 'Halaman belakang', 'Area bermain'],
      monthlyCosts: { utilities: 450000, management: 100000 },
      readiness: 'Dalam pembangunan',
      documentType: 'SHGB',
      documents: createDocumentExamples('SHGB', 'Dalam pembangunan'),
      timeline: createTimelineExamples()
    },
    {
      id: 'nara',
      name: 'Nara Park Residence',
      city: 'Malang',
      district: 'Lowokwaru',
      price: 720000000,
      beds: 3,
      baths: 2,
      building: 78,
      land: 98,
      type: 'Rumah',
      image: 'house-3',
      developer: 'Nara Hunian (contoh fiktif)',
      description: 'Listing fiktif rumah tiga kamar dengan ruang makan menyatu dengan ruang keluarga dan teras depan. Foto, lokasi, spesifikasi, harga, serta biaya bulanan merupakan ilustrasi; bukan penawaran nyata.',
      amenities: ['Carport', 'Teras', 'Area komunal'],
      monthlyCosts: { utilities: 650000, management: 200000 },
      readiness: 'Siap huni',
      documentType: 'SHM',
      documents: createDocumentExamples('SHM', 'Siap huni'),
      timeline: createTimelineExamples()
    },
    {
      id: 'avenue',
      name: 'Avenue City Apartment',
      city: 'Surabaya',
      district: 'Wiyung',
      price: 490000000,
      beds: 2,
      baths: 1,
      building: 42,
      land: null,
      type: 'Apartemen',
      image: 'apartment',
      developer: 'Avenue Living (contoh fiktif)',
      description: 'Listing fiktif apartemen dua kamar seluas 42 m² dengan lift dan area kebugaran bersama. Foto, lokasi, spesifikasi, harga, serta biaya bulanan merupakan ilustrasi; biaya pengelolaan perlu dikonfirmasi untuk penawaran nyata.',
      amenities: ['Lift', 'Keamanan', 'Area kebugaran'],
      monthlyCosts: { utilities: 650000, management: 550000 },
      readiness: 'Siap huni',
      documentType: 'SHMSRS',
      documents: createDocumentExamples('SHMSRS', 'Siap huni'),
      timeline: createTimelineExamples()
    },
    {
      id: 'teras',
      name: 'Teras Teduh Estate',
      city: 'Sidoarjo',
      district: 'Waru',
      price: 1150000000,
      beds: 4,
      baths: 3,
      building: 120,
      land: 144,
      type: 'Rumah',
      image: 'house-1',
      developer: 'Teras Properti (contoh fiktif)',
      description: 'Listing fiktif rumah empat kamar dengan teras, balkon, dan carport untuk dua mobil. Foto, lokasi, spesifikasi, harga, serta biaya bulanan merupakan ilustrasi; bukan penawaran nyata.',
      amenities: ['Carport 2 mobil', 'Taman', 'Balkon'],
      monthlyCosts: { utilities: 1000000, management: 300000 },
      readiness: 'Siap huni',
      documentType: 'SHM',
      documents: createDocumentExamples('SHM', 'Siap huni'),
      timeline: createTimelineExamples()
    },
    {
      id: 'puri-laras',
      name: 'Puri Laras Asri',
      city: 'Gresik',
      district: 'Driyorejo',
      price: 225000000,
      beds: 2,
      baths: 1,
      building: 30,
      land: 60,
      type: 'Rumah',
      image: 'house-2',
      developer: 'Puri Laras Hunian (contoh fiktif)',
      description: 'Listing fiktif rumah kompak dua kamar dengan halaman depan. Foto, lokasi, spesifikasi, harga, progres, serta biaya bulanan merupakan ilustrasi; harga ini tidak menunjukkan kelayakan program pembiayaan apa pun.',
      amenities: ['Halaman depan', 'Area jemur', 'Taman lingkungan'],
      monthlyCosts: { utilities: 350000, management: 75000 },
      readiness: 'Dalam pembangunan',
      documentType: 'SHGB',
      documents: createDocumentExamples('SHGB', 'Dalam pembangunan'),
      timeline: createTimelineExamples()
    },
    {
      id: 'griya-kencana',
      name: 'Griya Kencana',
      city: 'Sidoarjo',
      district: 'Krian',
      price: 285000000,
      beds: 2,
      baths: 1,
      building: 36,
      land: 66,
      type: 'Rumah',
      image: 'house-3',
      developer: 'Griya Kencana Properti (contoh fiktif)',
      description: 'Listing fiktif rumah dua kamar dengan teras dan area jemur di belakang. Foto, lokasi, spesifikasi, harga, serta biaya bulanan merupakan ilustrasi; harga ini tidak menunjukkan kelayakan program pembiayaan apa pun.',
      amenities: ['Teras', 'Area jemur', 'Carport'],
      monthlyCosts: { utilities: 400000, management: 100000 },
      readiness: 'Siap huni',
      documentType: 'SHM',
      documents: createDocumentExamples('SHM', 'Siap huni'),
      timeline: createTimelineExamples()
    },
    {
      id: 'surya-bandung', name: 'Surya Pagi Residence', city: 'Bandung', district: 'Antapani',
      price: 650000000, beds: 2, baths: 1, building: 55, land: 80, type: 'Rumah', image: 'house-1',
      developer: 'Surya Pagi (contoh fiktif)',
      description: 'Contoh rumah dengan panel surya di atap dan ventilasi silang. Spesifikasi, lokasi, harga, dan fitur hanya ilustrasi; bukan unit yang ditawarkan.',
      amenities: ['Carport', 'Taman'], features: ['Panel surya', 'Ventilasi silang'],
      monthlyCosts: { utilities: 550000, management: 150000 }, readiness: 'Siap huni', documentType: 'SHM',
      documents: createDocumentExamples('SHM', 'Siap huni'), timeline: createTimelineExamples()
    },
    {
      id: 'teduh-bogor', name: 'Teduh Bogor', city: 'Bogor', district: 'Tanah Sareal',
      price: 395000000, beds: 2, baths: 1, building: 40, land: 72, type: 'Rumah', image: 'house-2',
      developer: 'Teduh Hunian (contoh fiktif)',
      description: 'Contoh rumah dengan ventilasi silang dan pencahayaan alami. Seluruh rincian hanya ilustrasi dan belum diperiksa.',
      amenities: ['Teras', 'Halaman'], features: ['Ventilasi silang', 'Pencahayaan alami'],
      monthlyCosts: { utilities: 450000, management: 100000 }, readiness: 'Dalam pembangunan', documentType: 'SHGB',
      documents: createDocumentExamples('SHGB', 'Dalam pembangunan'), timeline: createTimelineExamples()
    },
    {
      id: 'banyu-semarang', name: 'Banyu Asri', city: 'Semarang', district: 'Tembalang',
      price: 425000000, beds: 2, baths: 1, building: 45, land: 75, type: 'Rumah', image: 'house-3',
      developer: 'Banyu Asri (contoh fiktif)',
      description: 'Contoh rumah dengan penampung air hujan untuk penggunaan nonminum dan pencahayaan alami. Fitur dan biaya hanya ilustrasi.',
      amenities: ['Carport', 'Halaman'], features: ['Penampung air hujan', 'Pencahayaan alami'],
      monthlyCosts: { utilities: 475000, management: 100000 }, readiness: 'Siap huni', documentType: 'SHM',
      documents: createDocumentExamples('SHM', 'Siap huni'), timeline: createTimelineExamples()
    },
    {
      id: 'mentari-makassar', name: 'Mentari Makassar', city: 'Makassar', district: 'Tamalanrea',
      price: 560000000, beds: 3, baths: 2, building: 60, land: 90, type: 'Rumah', image: 'house-1',
      developer: 'Mentari Hunian (contoh fiktif)',
      description: 'Contoh rumah dengan panel surya di atap dan area resapan. Data, foto, harga, dan ciri rumah hanya ilustrasi.',
      amenities: ['Carport', 'Teras'], features: ['Panel surya', 'Area resapan'],
      monthlyCosts: { utilities: 575000, management: 125000 }, readiness: 'Dalam pembangunan', documentType: 'SHGB',
      documents: createDocumentExamples('SHGB', 'Dalam pembangunan'), timeline: createTimelineExamples()
    }
  ];

  const checklistGroups = [
    {
      title: 'Siapkan anggaran awal',
      items: [
        {
          id: 'budget-income',
          label: 'Catat penghasilan bersih dan cicilan berjalan',
          hint: 'Gunakan pemasukan rutin yang dapat dibuktikan; pisahkan penghasilan tidak tetap.',
          url: ''
        },
        {
          id: 'budget-down-payment',
          label: 'Pisahkan uang muka, biaya transaksi, dan dana darurat',
          hint: 'Minta rincian biaya tertulis; jangan gunakan seluruh tabungan sebagai uang muka.',
          url: ''
        },
        {
          id: 'budget-monthly-costs',
          label: 'Hitung biaya hunian di luar cicilan',
          hint: 'Tambahkan listrik, air, pengelolaan, transportasi, dan perawatan ke anggaran bulanan.',
          url: ''
        }
      ]
    },
    {
      title: 'Siapkan pertanyaan dokumen',
      items: [
        {
          id: 'documents-land',
          label: 'Minta salinan sertipikat dan informasi hak atas tanah',
          hint: 'Catat pemegang hak, objek, masa berlaku jika ada, dan pertanyaan untuk PPAT atau kantor pertanahan.',
          url: ''
        },
        {
          id: 'documents-building',
          label: 'Tanyakan PBG, SLF, dan kesesuaian bangunan',
          hint: 'Minta nomor serta salinan dokumen; cocokkan alamat, fungsi, luas, dan kondisi di lokasi.',
          url: 'https://perizinan.pu.go.id/portal/services/simbg'
        },
        {
          id: 'documents-developer',
          label: 'Minta identitas penjual dan rancangan perjanjian',
          hint: 'Cocokkan pihak yang menerima pembayaran dan menandatangani; baca biaya serta ketentuan pembatalan.',
          url: ''
        }
      ]
    },
    {
      title: 'Kunjungan dan langkah ke bank',
      items: [
        {
          id: 'visit-condition',
          label: 'Jadwalkan kunjungan dan catat kondisi bangunan',
          hint: 'Periksa retak, rembesan, aliran air, listrik, ventilasi, dan progres jika belum selesai.',
          url: ''
        },
        {
          id: 'visit-neighborhood',
          label: 'Periksa akses dan kondisi lingkungan',
          hint: 'Coba rute harian; tanyakan riwayat genangan dan biaya lingkungan kepada pengelola serta warga.',
          url: ''
        },
        {
          id: 'bank-next-step',
          label: 'Siapkan dokumen untuk konsultasi pembiayaan',
          hint: 'Bawa identitas, bukti penghasilan, catatan utang, dan rincian properti. Checklist ini bukan pengajuan atau persetujuan bank.',
          url: 'https://www.btnproperti.co.id/'
        }
      ]
    }
  ];

  window.MatchHomeData = { properties, checklistGroups };
})();
