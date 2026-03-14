/**
 * 25 kategori dropdown untuk Buat Prompt (gambar/iklan/desain).
 * Tanpa sertifikat. Prompt per opsi: detail, Bahasa Indonesia + istilah desain yang dipakai generator gambar.
 */
export type SeedCat = {
  name: string;
  slug: string;
  description: string;
  options: { name: string; prompt: string }[];
};

function p(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export const DROPDOWN_SEED_GAMBAR: SeedCat[] = [
  {
    name: "Jenis karya & konteks",
    slug: "jenis-karya-konteks",
    description: "Untuk apa gambar dipakai",
    options: [
      {
        name: "Iklan bisnis (digital)",
        prompt: p(`Konteks: iklan digital bisnis (feed Instagram, Facebook Ads, banner web). Visual harus menonjolkan value proposition,
          CTA terasa tanpa teks wajib di gambar, hierarki visual jelas: satu fokus utama, ruang negatif cukup, aman untuk teks overlay.
          Gaya profesional korporat atau UMKM modern, tidak norak, kontras cukup untuk dibaca di layar kecil.`),
      },
      {
        name: "Poster promosi / cetak",
        prompt: p(`Konteks: poster promosi cetak atau digital A3/A2. Komposisi vertikal atau landscape kuat, area aman untuk judul besar,
          margin konsisten, titik fokal di golden ratio, warna cetak-friendly (CMYK mindset), detail tajam untuk print 300dpi feel.`),
      },
      {
        name: "Thumbnail YouTube / video",
        prompt: p(`Konteks: thumbnail video. Wajah atau subjek besar, ekspresi kuat, kontras tinggi, readable saat kecil, maksimal 2–3 elemen utama,
          background tidak mengacaukan subjek, gaya click-worthy tapi tidak clickbait murahan.`),
      },
      {
        name: "Story / reels vertikal",
        prompt: p(`Konteks: story Instagram/Reels vertikal 9:16. Area aman atas-bawah untuk UI, fokus tengah, dinamis, gesit, cocok swipe,
          tidak terlalu padat di pinggir.`),
      },
      {
        name: "Landing page & hero image",
        prompt: p(`Konteks: hero website / landing. Ruang kosong kanan atau kiri untuk headline, suasana trustworthy, modern SaaS atau brand,
          tidak terlalu ramai, lighting konsisten, subjek atau mockup proporsional.`),
      },
      {
        name: "Kemasan & label produk",
        prompt: p(`Konteks: desain kemasan atau visual konsep label. Permukaan produk realistis, lighting studio produk, material (kertas matte/glossy) believable,
          area duduk logo dan copy jelas.`),
      },
    ],
  },
  {
    name: "Iklan & marketing visual",
    slug: "iklan-marketing-visual",
    description: "Gaya komunikasi visual iklan",
    options: [
      {
        name: "Korporat bersih",
        prompt: p(`Iklan gaya korporat: palet terkendali (biru, abu, putih atau brand-safe), grid rapi, foto orang profesional natural,
          tidak stock photo kaku berlebihan, pesan "terpercaya dan stabil".`),
      },
      {
        name: "Flash sale / promo",
        prompt: p(`Visual promo diskon: energi tinggi, aksen merah/oranye/kuning terukur, hierarki "hemat" jelas tanpa harus ada teks,
          dinamis tapi tidak norak neon penuh layar.`),
      },
      {
        name: "Storytelling emosional",
        prompt: p(`Iklan berbasis cerita: satu momen autentik, pencahayaan hangat, kedalaman emosi, relatable, tidak template "senyum sempurna" generik.`),
      },
      {
        name: "Before-after / transformasi",
        prompt: p(`Konsep before-after visual (split atau transisi): kontras jelas dua keadaan, tetap elegan, tidak gimmick berlebihan.`),
      },
      {
        name: "Social proof / testimoni vibe",
        prompt: p(`Nuansa testimoni: suasana nyata (kantor, rumah), orang natural, trust badge feel tanpa desain clipart murahan.`),
      },
      {
        name: "B2B serius",
        prompt: p(`B2B: minimal, diagram-friendly background, industri, presisi, warna konservatif, tidak playful berlebihan.`),
      },
    ],
  },
  {
    name: "Gaya visual utama",
    slug: "gaya-visual-utama",
    description: "Arah estetika besar",
    options: [
      {
        name: "Fotorealistik",
        prompt: p(`Fotorealistik tinggi: detail kulit dan material natural, depth of field believable, noise kamera halus, tidak wax figure,
          pencahayaan fisik konsisten.`),
      },
      {
        name: "Ilustrasi flat modern",
        prompt: p(`Ilustrasi flat modern: bentuk geometris bersih, bayangan flat atau sangat halus, palet terkurasi, karakter proporsional stylized,
          tidak clipart 2000-an.`),
      },
      {
        name: "3D render lembut",
        prompt: p(`3D stylized lembut: subsurface halus, rounded forms, lighting studio 3D, tidak plastik mengkilap berlebihan, estetika Apple-like atau Blender friendly.`),
      },
      {
        name: "Watercolor / cat air",
        prompt: p(`Gaya cat air: bleed warna natural, tekstur kertas halus, tepi organik, suasana artis, tidak digital smudge kasar.`),
      },
      {
        name: "Line art & minimal stroke",
        prompt: p(`Line art tebal-tipis variatif, isian putih atau spot color, ruang kosong banyak, elegan editorial.`),
      },
      {
        name: "Retro / vintage",
        prompt: p(`Retro vintage: grain film, fade warna, tipografi era tertentu (70s/80s/90s) tanpa parodi berlebihan, authentic wear.`),
      },
    ],
  },
  {
    name: "Pencahayaan",
    slug: "pencahayaan",
    description: "Cahaya & bayangan",
    options: [
      {
        name: "Softbox studio",
        prompt: p(`Pencahayaan softbox besar: bayangan lembut, highlight gradual, cocok produk dan portrait komersial, tidak hotspot keras.`),
      },
      {
        name: "Golden hour",
        prompt: p(`Golden hour: matahari rendah, warna hangat peach-gold, rim light halus, long shadow panjang natural.`),
      },
      {
        name: "High key terang",
        prompt: p(`High key: background terang mendekati putih, sedikit bayangan, suasana fresh, clean, medis atau beauty.`),
      },
      {
        name: "Low key dramatis",
        prompt: p(`Low key: mayoritas gelap, satu sumber cahaya kuat, kontras tinggi, cinematic, moody.`),
      },
      {
        name: "Neon malam kota",
        prompt: p(`Neon urban night: pantulan basah aspal, multiple colored light sources, atmosphere humid, tidak oversaturated full frame.`),
      },
      {
        name: "Overcast natural",
        prompt: p(`Langit mendung: cahaya diffuse besar, warna true-to-life, tidak flat membosankan—tetap depth lewat kontras halus.`),
      },
    ],
  },
  {
    name: "Komposisi & framing",
    slug: "komposisi-framing",
    description: "Tata letak bidang gambar",
    options: [
      {
        name: "Rule of thirds",
        prompt: p(`Komposisi rule of thirds: subjek di persilangan grid, ruang arah pandang, tidak centered statis kecuali intentional.`),
      },
      {
        name: "Simetri pusat",
        prompt: p(`Simetri kuat di sumbu tengah: monumental, arsitektur, produk hero centered, balance formal.`),
      },
      {
        name: "Leading lines",
        prompt: p(`Leading lines: jalan, rel, bangunan, atau elemen desain mengarah ke fokus, depth jelas.`),
      },
      {
        name: "Foreground frame",
        prompt: p(`Foreground framing: dedaunan, jendela, lengkungan membingkai subjek, lapisan kedalaman.`),
      },
      {
        name: "Negative space besar",
        prompt: p(`Negative space dominan: minimal, ruang untuk teks desainer, satu objek kecil atau medium, sophisticated.`),
      },
      {
        name: "Dynamic diagonal",
        prompt: p(`Diagonal energik: elemen miring, action feel, tidak kacau—tetap readable.`),
      },
    ],
  },
  {
    name: "Palet & warna",
    slug: "palet-warna",
    description: "Kombinasi warna",
    options: [
      {
        name: "Monokrom elegan",
        prompt: p(`Palet monokrom: satu hue variasi saturasi dan brightness, sophisticated, tidak abu membosankan—ada aksen tonal.`),
      },
      {
        name: "Analog hangat",
        prompt: p(`Analog warm: oranye, merah terakota, kuning emas, harmonis, cozy brand.`),
      },
      {
        name: "Dingin profesional",
        prompt: p(`Cool professional: biru teal, cyan, abu biru, tech dan kesehatan, trustworthy.`),
      },
      {
        name: "Kontras komplementer",
        prompt: p(`Komplementer terkontrol: satu pasang warna lawan (biru-oranye) dengan satu dominan 70%, tidak clown.`),
      },
      {
        name: "Pastel lembut",
        prompt: p(`Pastel lembut: saturasi rendah, baby brand, wellness, tidak washed out total—tetap kontras readable.`),
      },
      {
        name: "Earth tone natural",
        prompt: p(`Earth tone: coklat, olive, cream, stone, organic brand, sustainable vibe.`),
      },
    ],
  },
  {
    name: "Mood & emosi",
    slug: "mood-emosi",
    description: "Suasana psikologis",
    options: [
      {
        name: "Optimis & enerjik",
        prompt: p(`Mood optimis: warna cerah terukur, gerakan halus atau pose aktif, tidak norak.`),
      },
      {
        name: "Tenang & premium",
        prompt: p(`Mood tenang premium: slow, spacious, material mahal, whisper luxury.`),
      },
      {
        name: "Misterius & premium gelap",
        prompt: p(`Mood misterius: gelap elegan, highlight selektif, noir modern.`),
      },
      {
        name: "Ramah & inklusif",
        prompt: p(`Mood ramah inklusif: beragam, hangat, approachable, tidak corporate dingin.`),
      },
      {
        name: "Playful kreatif",
        prompt: p(`Playful: bentuk organik, warna joyful, tetap profesional untuk brand kreatif.`),
      },
      {
        name: "Urgent penting",
        prompt: p(`Urgent tanpa panic: kontras, arah visual ke satu titik, seriousness.`),
      },
    ],
  },
  {
    name: "Tipografi & hierarki teks",
    slug: "tipografi-hierarki",
    description: "Jika ada teks di gambar",
    options: [
      {
        name: "Sans modern tebal",
        prompt: p(`Tipografi: sans-serif geometris modern, judul bold besar, tracking sedikit wide, anti cluttered.`),
      },
      {
        name: "Serif editorial",
        prompt: p(`Tipografi: serif editorial fashion/magazine, elegan, kontras ukuran judul-body jelas.`),
      },
      {
        name: "Display playful",
        prompt: p(`Display font playful satu judul saja, sisanya sans clean, tidak font campur lebih dari 2 keluarga.`),
      },
      {
        name: "Tanpa teks (visual only)",
        prompt: p(`Tidak ada teks di gambar: semua pesan lewat visual, area siap overlay oleh desainer.`),
      },
      {
        name: "Tipografi campuran ID-EN",
        prompt: p(`Hierarki teks campuran Indonesia-Inggris ok: satu bahasa dominan visual, alignment grid ketat.`),
      },
    ],
  },
  {
    name: "Tekstur & material",
    slug: "tekstur-material",
    description: "Permukaan dan feel",
    options: [
      {
        name: "Kertas & karton",
        prompt: p(`Tekstur kertas rough atau linen, subtle shadow contact, craft authentic.`),
      },
      {
        name: "Kaca & refleksi",
        prompt: p(`Permukaan kaca, refleksi believable, fresnel halus, tidak mirror sempurna fake.`),
      },
      {
        name: "Kain & tekstil",
        prompt: p(`Tekstil: weave halus, drape natural, wrinkles realistis.`),
      },
      {
        name: "Logam brushed",
        prompt: p(`Logam brushed atau matte aluminum, fingerprint-free look, industrial premium.`),
      },
      {
        name: "Grain foto analog",
        prompt: p(`Grain film 35mm halus, tidak noise digital blocky, nostalgic quality.`),
      },
    ],
  },
  {
    name: "E-commerce & produk",
    slug: "ecommerce-produk",
    description: "Jualan online",
    options: [
      {
        name: "Putih bersih marketplace",
        prompt: p(`Foto produk background putih murni, bayangan contact lembut, warna produk akurat, standar Tokopedia/Shopee premium.`),
      },
      {
        name: "Lifestyle in-use",
        prompt: p(`Produk dipakai di konteks nyata: meja, tangan, ruangan, storytelling pemakaian.`),
      },
      {
        name: "Flat lay stylist",
        prompt: p(`Flat lay dari atas: props komplementer, grid rapi, warna harmonis, Instagram shop aesthetic.`),
      },
      {
        name: "360 feel single shot",
        prompt: p(`Satu angle yang menunjukkan bentuk 3D produk jelas: highlight edge, tidak flat mystery.`),
      },
      {
        name: "Bundle / set",
        prompt: p(`Beberapa SKU satu frame: grup rapi, scale konsisten, tidak overlap kacau.`),
      },
    ],
  },
  {
    name: "Kuliner & F&B",
    slug: "kuliner-fb",
    description: "Makanan minuman",
    options: [
      {
        name: "Makanan hangat fresh",
        prompt: p(`Kuliner: uap halus believable, highlight minyak dan tekstur, warna appetite, tidak overcooked look.`),
      },
      {
        name: "Minuman dingin",
        prompt: p(`Es kondensasi realistis, gelas berembun, backlight through liquid, refreshing.`),
      },
      {
        name: "Coffee shop aesthetic",
        prompt: p(`Kopi: latte art sharp, kayu meja, morning light window, cozy third place.`),
      },
      {
        name: "Fine dining",
        prompt: p(`Fine dining: plating minimal Michelin style, crockery premium, lighting rendah elegan.`),
      },
      {
        name: "Street food autentik",
        prompt: p(`Street food: asap wajan, keramaian blur background, warna panas, authentic regional.`),
      },
    ],
  },
  {
    name: "Mode & beauty",
    slug: "mode-beauty",
    description: "Fashion & kecantikan",
    options: [
      {
        name: "Editorial fashion",
        prompt: p(`Fashion editorial: pose kuat, lighting studio fashion, fabric drape high-end, Vogue-lite tanpa copy paste pose generik.`),
      },
      {
        name: "Beauty close-up",
        prompt: p(`Beauty: kulit natural dengan texture halus true, makeup clean, catchlight mata satu sumber, tidak plastic skin.`),
      },
      {
        name: "Lookbook outdoor",
        prompt: p(`Lookbook outdoor: natural light, gerakan jalan, urban atau nature backdrop cohesive.`),
      },
      {
        name: "Aksesori detail",
        prompt: p(`Fokus aksesori: perhiasan, jam, tas—macro believable, bokeh creamy.`),
      },
    ],
  },
  {
    name: "Teknologi & SaaS",
    slug: "teknologi-saas",
    description: "Digital product & tech",
    options: [
      {
        name: "UI mockup device",
        prompt: p(`Device mockup: laptop/phone dengan layar UI blur atau generic, perspective benar, shadow meja, modern startup.`),
      },
      {
        name: "Abstract tech",
        prompt: p(`Abstract tech: node network halus, gradient mesh elegan, tidak matrix cliché penuh layar.`),
      },
      {
        name: "Data viz vibe",
        prompt: p(`Nuansa data: chart shapes abstrak, clean grid, biru-ungu tech, trustworthy analytics.`),
      },
      {
        name: "AI & futuristik halus",
        prompt: p(`AI visual halus: partikel ringan, glass morphism sedikit, tidak robot cliché besar.`),
      },
    ],
  },
  {
    name: "Kesehatan & wellness",
    slug: "kesehatan-wellness",
    description: "Medis, fitness, spa",
    options: [
      {
        name: "Klinis bersih",
        prompt: p(`Medis bersih: putih-biru-hijau muda, stetoskop atau elemen subtle, trustworthy sterile warm.`),
      },
      {
        name: "Fitness energi",
        prompt: p(`Fitness: gerakan, otot natural, gym lighting dramatic tapi tidak aggressive.`),
      },
      {
        name: "Spa zen",
        prompt: p(`Spa: batu, air, tanaman, muted green, slow mood, tidak stock spa clipart.`),
      },
      {
        name: "Mental health lembut",
        prompt: p(`Mental health: lembut, ruang aman, metafora halus (jendela terbuka, tanaman), tidak dramatis gelap.`),
      },
    ],
  },
  {
    name: "Pendidikan & edukasi",
    slug: "pendidikan-edukasi",
    description: "Kursus, sekolah, konten belajar",
    options: [
      {
        name: "Kursus online modern",
        prompt: p(`Edukasi digital: ilustrasi orang belajar laptop, ikon flat pendamping, friendly expert.`),
      },
      {
        name: "Anak & playful edu",
        prompt: p(`Edu anak: warna ceria terukur, bentuk rounded safe, tidak infantil berlebihan.`),
      },
      {
        name: "Universitas formal",
        prompt: p(`Akademik formal: bangunan kampus, buku, suasana serius aspirational.`),
      },
    ],
  },
  {
    name: "Travel & pariwisata",
    slug: "travel-pariwisata",
    description: "Destinasi & pengalaman",
    options: [
      {
        name: "Landscape ikonik",
        prompt: p(`Travel landscape: golden hour destination, depth layers foreground-mid-background, wanderlust tanpa postcard cliché total.`),
      },
      {
        name: "Urban explore",
        prompt: p(`Kota explore: jalan, arsitektur lokal, human scale, storytelling tempat.`),
      },
      {
        name: "Resort relax",
        prompt: p(`Resort: pool, pantai, chaise, luxury relax, tidak oversaturated turquoise fake.`),
      },
    ],
  },
  {
    name: "Event & hiburan",
    slug: "event-hiburan",
    description: "Konser, pesta, gathering",
    options: [
      {
        name: "Konser cahaya",
        prompt: p(`Event konser: beam light volumetrik, crowd bokeh, energi malam, tidak noise warna acak.`),
      },
      {
        name: "Pernikahan elegan",
        prompt: p(`Wedding elegant: bunga, linen, soft light, timeless palette cream blush green.`),
      },
      {
        name: "Corporate event",
        prompt: p(`Corporate event: stage clean, branding space, professional crowd.`),
      },
    ],
  },
  {
    name: "Arsitektur & interior",
    slug: "arsitektur-interior",
    description: "Bangunan & ruang",
    options: [
      {
        name: "Interior minimal Skandinavia",
        prompt: p(`Interior Scandi: kayu terang, tanaman, furniture clean lines, window light besar.`),
      },
      {
        name: "Brutalisme modern",
        prompt: p(`Arsitektur brutalist: beton texture, bayangan keras geometris, monumental.`),
      },
      {
        name: "Retail display",
        prompt: p(`Interior toko: shelving, produk arranged, lighting accent produk.`),
      },
    ],
  },
  {
    name: "Karakter & orang",
    slug: "karakter-orang",
    description: "Figur manusia di gambar",
    options: [
      {
        name: "Portrait natural",
        prompt: p(`Portrait natural: ekspresi genuine, lens 85mm feel, background bokeh, skin texture halus real.`),
      },
      {
        name: "Tim diverse",
        prompt: p(`Tim kerja diverse: kantor modern, interaksi natural, tidak pose baris kaku.`),
      },
      {
        name: "Siluet / anonim",
        prompt: p(`Figur siluet atau backlit anonim: fokus konsep bukan identitas.`),
      },
    ],
  },
  {
    name: "Lingkungan & latar",
    slug: "lingkungan-latar",
    description: "Tempat & atmosfer",
    options: [
      {
        name: "Kantor modern",
        prompt: p(`Background kantor: open space, glass partition, plant, daylight, startup atau corporate.`),
      },
      {
        name: "Outdoor alam",
        prompt: p(`Alam: hutan, gunung, pantai—cuaca dan musim konsisten, tidak HDR excess.`),
      },
      {
        name: "Urban street",
        prompt: p(`Jalan kota: kedalaman, signage blur, golden atau blue hour.`),
      },
      {
        name: "Studio abstrak",
        prompt: p(`Latar studio gradient atau cyclorama halus, fokus 100% subjek.`),
      },
    ],
  },
  {
    name: "Rasio & format",
    slug: "rasio-format",
    description: "Proporsi output",
    options: [
      {
        name: "1:1 feed",
        prompt: p(`Komposisi aman untuk crop 1:1: fokus tidak terpotong di tengah square.`),
      },
      {
        name: "16:9 presentasi",
        prompt: p(`Komposisi landscape 16:9: ruang presentasi, tidak terlalu tinggi vertikal di tengah.`),
      },
      {
        name: "4:5 Instagram",
        prompt: p(`Portrait 4:5: aman untuk feed IG, margin atas bawah.`),
      },
      {
        name: "9:16 vertikal penuh",
        prompt: p(`Vertikal penuh 9:16: safe zone 10% atas bawah kosong untuk UI.`),
      },
      {
        name: "A4 portrait dokumen",
        prompt: p(`Proporsi mirip A4 vertikal: margin cetak, tidak full bleed kecuali intentional.`),
      },
    ],
  },
  {
    name: "Detail & kualitas output",
    slug: "detail-kualitas-output",
    description: "Resolusi dan finishing",
    options: [
      {
        name: "8K detail halus",
        prompt: p(`Detail sangat halus 8K mindset: tekstur readable, tidak mushy, sharp pada subjek utama.`),
      },
      {
        name: "Print 300dpi mindset",
        prompt: p(`Siap cetak: tidak banding, noise terkontrol, color tidak clip highlight shadow.`),
      },
      {
        name: "Web optimized clean",
        prompt: p(`Optimized web: contrast sRGB friendly, tidak artifact compression look.`),
      },
    ],
  },
  {
    name: "Brand & gaya industri",
    slug: "brand-gaya-industri",
    description: "Sektor vertikal",
    options: [
      {
        name: "Fintech trust",
        prompt: p(`Fintech: biru navy, gold accent sedikit, secure calm, tidak gambler vibe.`),
      },
      {
        name: "Eco sustainable",
        prompt: p(`Green brand: daun, material recycled visual, earth tone, honest tidak greenwashing cliché.`),
      },
      {
        name: "Anak & mainan",
        prompt: p(`Anak: ceria aman, rounded, tidak menakutkan, parent trust.`),
      },
      {
        name: "Otomotif",
        prompt: p(`Otomotif: refleksi cat mobil, showroom light, speed line subtle.`),
      },
      {
        name: "Properti real estat",
        prompt: p(`Properti: ruang luas, cahaya natural, staging modern netral.`),
      },
    ],
  },
  {
    name: "Efek khusus (subtil)",
    slug: "efek-khusus-subtil",
    description: "Sentuhan akhir",
    options: [
      {
        name: "Bokeh creamy",
        prompt: p(`Bokeh creamy besar, spherical highlight, lens character halus.`),
      },
      {
        name: "Lens flare natural",
        prompt: p(`Lens flare satu sun source believable, tidak sci-fi rainbow penuh.`),
      },
      {
        name: "Motion blur halus",
        prompt: p(`Motion blur directional halus pada background saja atau subjek gerak, shutter speed feel.`),
      },
      {
        name: "Tilt-shift miniatur",
        prompt: p(`Tilt-shift subtle: miniatur feel selective focus, tidak gimmick penuh frame.`),
      },
    ],
  },
  {
    name: "Gaya regional & budaya",
    slug: "gaya-regional-budaya",
    description: "Nuansa lokal",
    options: [
      {
        name: "Indonesia kontemporer",
        prompt: p(`Nuansa Indonesia kontemporer: batik motif modern abstract, warna lokal terkurasi, tidak klenik stock.`),
      },
      {
        name: "Asia minimal",
        prompt: p(`Asia minimal: zen space, material bambu batu, negative space.`),
      },
      {
        name: "Mediterania",
        prompt: p(`Mediterania: putih kapur, biru laut, terracotta, sinar keras.`),
      },
    ],
  },
];
