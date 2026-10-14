const DATABASE_URL =
  "https://script.google.com/macros/s/AKfycbwqTKeqL13lcPQt3CVLPK2Kc43fcNXvmDFD8h1bmfuPgGWqs2WH2tZxtonH2fq6XmTl/exec";

// --- AUTH & LOGIN ---
function toggleAuthModal() {
  const authModal = document.getElementById("auth-modal");
  const profileModal = document.getElementById("profile-modal");
  const currentUser = JSON.parse(localStorage.getItem("userSession"));
  if (currentUser) {
    document.getElementById("profile-nama").innerText = currentUser.nama;
    document.getElementById("profile-hp").innerText = currentUser.hp;
    loadOrderHistory(currentUser.hp);
    authModal.classList.add("hidden");
    profileModal.classList.remove("hidden");
  } else {
    profileModal.classList.add("hidden");
    authModal.classList.toggle("hidden");
  }
}

function prosesLogout() {
  if (confirm("Apakah Anda yakin ingin keluar dari akun?")) {
    localStorage.removeItem("userSession");
    document.getElementById("profile-modal").classList.add("hidden");
    checkUserSession();
    showSuccessToast("Logout Berhasil", "Anda telah keluar dari sesi.");
  }
}

function loadOrderHistory(userHp) {
  const container = document.getElementById("profile-history-list");
  if (!container) return;
  let orders = JSON.parse(localStorage.getItem("mockOrders") || "[]");
  let userOrders = orders.filter(
    (o) =>
      o.telepon === userHp &&
      (o.keperluan === "Pemesanan" || o.keperluan === "Order") &&
      o.cartItems &&
      o.cartItems.length > 0,
  );

  if (userOrders.length === 0) {
    container.innerHTML = `<div class="text-center p-6 bg-gray-50 rounded-xl border border-gray-100"><i class="fas fa-box-open text-3xl text-gray-300 mb-2 block"></i><p class="text-gray-500 text-sm">Belum ada riwayat pesanan.</p></div>`;
    return;
  }
  container.innerHTML = "";
  userOrders.reverse().forEach((order) => {
    let badgeColor = "bg-gray-200 text-gray-700";
    let status = order.status_pesanan || "Menunggu Konfirmasi";
    if (status === "Diproses")
      badgeColor = "bg-blue-100 text-blue-700 border-blue-200";
    if (status === "Dikirim")
      badgeColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (status === "Selesai")
      badgeColor = "bg-green-100 text-green-700 border-green-200";

    let itemsHtml = order.cartItems
      .map(
        (item) =>
          `<div class="text-xs text-gray-600 font-medium">• ${item.qty}x ${item.name} <span class="text-[10px] text-gray-400">(${[item.bentuk, item.size, item.roast].filter(Boolean).join(", ")})</span></div>`,
      )
      .join("");

    // Tombol bayar jika pesanan membutuhkan pembayaran QRIS
    let bayarBtnHtml = "";
    if (
      status === "Menunggu Pembayaran" ||
      status === "Menunggu Verifikasi" ||
      order.total_bayar
    ) {
      bayarBtnHtml = `<button type="button" onclick="openPaymentModal('${order.kode_tracking}')" class="mt-3 w-full bg-sekarsa-navy text-white py-2 rounded-lg text-xs font-bold hover:bg-sekarsa-dark transition shadow-sm"><i class="fas fa-qrcode mr-1.5"></i> ${status === "Menunggu Verifikasi" ? "Cek Status / Kirim Ulang Bukti" : "Bayar / Unggah Bukti"}</button>`;
    }

    container.innerHTML += `
        <div class="border border-gray-200 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition">
            <div class="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                <div>
                    <span class="text-[10px] text-gray-400 block mb-0.5"><i class="far fa-clock"></i> ${order.date}</span>
                    <b class="text-sekarsa-navy text-xs sm:text-sm tracking-wider"><i class="fas fa-receipt text-gray-300 mr-1"></i>${order.kode_tracking || "Tanpa Resi"}</b>
                </div>
                <span class="px-2 sm:px-3 py-1 border rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${badgeColor}">${status}</span>
            </div>
            <div class="mb-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100">${itemsHtml}</div>
            <div class="flex justify-between items-center pt-1 mb-2">
                <span class="text-xs font-bold text-gray-500">Total Harga:</span>
                <span class="text-sm font-bold text-sekarsa-red">${order.totalHarga || formatRupiah(order.total_bayar || 0)}</span>
            </div>
            ${bayarBtnHtml}
        </div>`;
  });
}

function switchAuthTab(tab) {
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const btnLogin = document.getElementById("tab-login");
  const btnRegister = document.getElementById("tab-register");

  if (tab === "login") {
    formLogin.classList.replace("hidden", "block");
    formRegister.classList.replace("block", "hidden");
    btnLogin.className =
      "flex-1 py-3 text-center font-bold text-sekarsa-ochre border-b-2 border-sekarsa-ochre outline-none";
    btnRegister.className =
      "flex-1 py-3 text-center font-medium text-gray-400 border-b-2 border-transparent hover:text-gray-600 outline-none";
  } else {
    formRegister.classList.replace("hidden", "block");
    formLogin.classList.replace("block", "hidden");
    btnRegister.className =
      "flex-1 py-3 text-center font-bold text-sekarsa-ochre border-b-2 border-sekarsa-ochre outline-none";
    btnLogin.className =
      "flex-1 py-3 text-center font-medium text-gray-400 border-b-2 border-transparent hover:text-gray-600 outline-none";
  }
}

function prosesDaftar(event) {
  const nama = document.getElementById("reg-nama").value.trim();
  const hp = document.getElementById("reg-hp").value.trim();
  const pass = document.getElementById("reg-pass").value.trim();
  if (!nama || !hp || !pass) {
    alert("Semua kolom harus diisi!");
    return;
  }

  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.innerHTML = "Memproses...";
  btn.disabled = true;

  fetch(DATABASE_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "register",
      nama: nama,
      hp: hp,
      password: pass,
    }),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        showSuccessToast("Berhasil", "Pendaftaran sukses! Silakan login.");
        switchAuthTab("login");
        document.getElementById("login-hp").value = hp;
        document.getElementById("form-register").reset();
      } else {
        alert(data.message);
      }
    })
    .catch(() => alert("Terjadi kesalahan koneksi."))
    .finally(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
}

function prosesLogin(event) {
  const hp = document.getElementById("login-hp").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  if (!hp || !pass) {
    alert("Isi Nomor HP dan Password!");
    return;
  }

  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.innerHTML = "Memproses...";
  btn.disabled = true;

  fetch(DATABASE_URL, {
    method: "POST",
    body: JSON.stringify({ action: "login", hp: hp, password: pass }),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        localStorage.setItem(
          "userSession",
          JSON.stringify({ nama: data.user.nama, hp: hp }),
        );
        toggleAuthModal();
        checkUserSession();
        showSuccessToast(
          "Login Berhasil",
          `Selamat datang, ${data.user.nama}!`,
        );
        document.getElementById("form-login").reset();
      } else {
        alert(data.message);
      }
    })
    .catch(() => alert("Terjadi kesalahan koneksi."))
    .finally(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
}

function checkUserSession() {
  const currentUser = JSON.parse(localStorage.getItem("userSession"));
  const navText = document.getElementById("nav-auth-text");
  const mobileText = document.getElementById("mobile-auth-text");
  if (currentUser) {
    if (navText) navText.innerHTML = "Halo, " + currentUser.nama.split(" ")[0];
    if (mobileText)
      mobileText.innerHTML = "Halo, " + currentUser.nama.split(" ")[0];
  } else {
    if (navText) navText.innerHTML = "Login / Daftar";
    if (mobileText) mobileText.innerHTML = "Login / Daftar";
  }
}

// --- LOGIC LAINNYA ---
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const mobileMenu = document.getElementById("mobile-menu");
if (mobileMenuBtn && mobileMenu) {
  const mobileMenuIcon = mobileMenuBtn.querySelector("i");
  mobileMenuBtn.addEventListener("click", () => {
    const isClosed = mobileMenu.classList.contains("closed");
    if (isClosed) {
      mobileMenu.classList.remove("closed", "hidden");
      mobileMenu.classList.add("open", "flex");
      mobileMenuIcon.classList.remove("fa-bars");
      mobileMenuIcon.classList.add("fa-times");
    } else {
      mobileMenu.classList.add("closed");
      mobileMenu.classList.remove("open");
      mobileMenuIcon.classList.remove("fa-times");
      mobileMenuIcon.classList.add("fa-bars");
      setTimeout(() => {
        if (mobileMenu.classList.contains("closed"))
          mobileMenu.classList.replace("flex", "hidden");
      }, 300);
    }
  });

  document.querySelectorAll(".mobile-menu-links a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("closed");
      mobileMenu.classList.remove("open");
      mobileMenuIcon.classList.remove("fa-times");
      mobileMenuIcon.classList.add("fa-bars");
      setTimeout(() => {
        if (mobileMenu.classList.contains("closed"))
          mobileMenu.classList.replace("flex", "hidden");
      }, 300);
    });
  });
}

window.addEventListener("load", function () {
  if (typeof Swiper !== "undefined") {
    if (document.querySelector(".produkUnggulanSwiper")) {
      new Swiper(".produkUnggulanSwiper", {
        effect: "cards",
        grabCursor: true,
        loop: true,
        autoplay: { delay: 3000, disableOnInteraction: false },
        pagination: { el: ".swiper-pagination", dynamicBullets: true },
      });
    }
    if (document.querySelector(".teamSwiper")) {
      new Swiper(".teamSwiper", {
        observer: true,
        observeParents: true,
        slidesPerView: "auto",
        spaceBetween: 15,
        loop: false,
        pagination: { el: ".swiper-pagination", clickable: true },
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
        breakpoints: {
          640: { spaceBetween: 15 },
          768: { spaceBetween: 20 },
          1024: { spaceBetween: 30 },
        },
      });
    }
  }
});

// MENARIK DATA CART DARI LOCALSTORAGE SAAT HALAMAN DIMUAT (GLOBAL)
let cart = {};
try {
  cart = JSON.parse(localStorage.getItem("tempCart")) || {};
} catch (e) {}

function formatRupiah(angka) {
  return "Rp " + angka.toLocaleString("id-ID");
}

const cartSidebar = document.getElementById("cart-sidebar");
const cartOverlay = document.getElementById("cart-overlay");
const floatingCartBtn = document.getElementById("floating-cart-btn");
const closeCartBtn = document.getElementById("close-cart-btn");

function toggleCart() {
  if (!cartSidebar || !cartOverlay) return;
  const isOpen = !cartSidebar.classList.contains("translate-x-full");
  if (isOpen) {
    cartSidebar.classList.add("translate-x-full");
    cartOverlay.classList.add("opacity-0");
    setTimeout(() => cartOverlay.classList.add("hidden"), 300);
  } else {
    cartOverlay.classList.remove("hidden");
    setTimeout(() => {
      cartOverlay.classList.remove("opacity-0");
      cartSidebar.classList.remove("translate-x-full");
    }, 10);
  }
}

if (floatingCartBtn) floatingCartBtn.addEventListener("click", toggleCart);
if (closeCartBtn) closeCartBtn.addEventListener("click", toggleCart);
if (cartOverlay) cartOverlay.addEventListener("click", toggleCart);

function updateCartUI() {
  const itemsListContainer = document.getElementById("cart-items-list");
  const totalPriceContainer = document.getElementById("cart-total-price");
  const cartBadge = document.getElementById("cart-badge");
  if (!itemsListContainer || !totalPriceContainer || !cartBadge) return;

  itemsListContainer.innerHTML = "";
  let total = 0;
  let totalQty = 0;

  for (const cartKey in cart) {
    const item = cart[cartKey];
    if (item.qty > 0) {
      totalQty += item.qty;
      total += item.price * item.qty;
      const row = document.createElement("div");
      row.className =
        "flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm";
      const bentukLabel = item.bentuk
        ? `<span class="text-[10px] bg-sekarsa-navy text-white px-2 py-0.5 rounded ml-2">${item.bentuk}</span>`
        : "";
      const sizeLabel = item.size
        ? `<span class="text-[10px] bg-gray-200 text-sekarsa-dark px-2 py-0.5 rounded ml-1">${item.size}</span>`
        : "";
      const roastLabel = item.roast
        ? `<span class="text-[10px] bg-sekarsa-tan text-white px-2 py-0.5 rounded mt-1 inline-block">${item.roast}</span>`
        : "";
      row.innerHTML = `<div class="flex-1 pr-2"><span class="font-bold text-sekarsa-dark text-xs sm:text-sm block mb-0.5">${item.name} ${bentukLabel}${sizeLabel}</span>${roastLabel}<div class="text-[10px] sm:text-xs text-gray-500 font-medium mt-1">${formatRupiah(item.price)} <span class="mx-1">x</span> ${item.qty} pcs</div></div><div class="text-right flex flex-col items-end justify-between gap-2"><button class="btn-hapus-item text-gray-400 hover:text-sekarsa-red transition outline-none" data-cart-key="${cartKey}" title="Hapus dari keranjang"><i class="fas fa-trash-alt"></i></button><span class="font-bold text-sekarsa-red text-xs sm:text-sm block">${formatRupiah(item.price * item.qty)}</span></div>`;
      itemsListContainer.appendChild(row);
    }
  }
  totalPriceContainer.innerText = formatRupiah(total);
  cartBadge.innerText = totalQty;
  if (totalQty > 0) {
    floatingCartBtn.classList.remove("hidden");
    floatingCartBtn.classList.add("flex");
  } else {
    floatingCartBtn.classList.add("hidden");
    floatingCartBtn.classList.remove("flex");
  }

  document.dispatchEvent(new Event("cartUpdated"));
}

// --- QUIZ KOPI ADVISOR ---
let quizData = [
  {
    question: "Bagaimana kekuatan rasa kopi favoritmu?",
    options: [
      {
        label: "Kuat, pahit, dan nendang",
        icon: "fa-bolt",
        scores: { p_robusta: 3, p_houseblend: 1 },
      },
      {
        label: "Manis dengan sentuhan buah",
        icon: "fa-lemon",
        scores: { p_arabika_nat: 3 },
      },
      {
        label: "Manis lembut & seimbang",
        icon: "fa-heart",
        scores: { p_arabika_honey: 3, p_houseblend: 1 },
      },
      {
        label: "Simpel, yang penting enak",
        icon: "fa-bolt-lightning",
        scores: { p_dripbag: 3, p_houseblend: 1 },
      },
    ],
  },
  {
    question: "Kapan biasanya kamu paling sering ngopi?",
    options: [
      {
        label: "Pagi buru-buru",
        icon: "fa-sun",
        scores: { p_dripbag: 3, p_robusta: 1 },
      },
      {
        label: "Santai sore sambil ngobrol",
        icon: "fa-mug-saucer",
        scores: { p_arabika_honey: 2, p_houseblend: 2 },
      },
      {
        label: "Waktu me-time, eksplor rasa",
        icon: "fa-compass",
        scores: { p_arabika_nat: 3 },
      },
      {
        label: "Kapan saja, sejati",
        icon: "fa-infinity",
        scores: { p_robusta: 2, p_houseblend: 1 },
      },
    ],
  },
  {
    question: "Cara seduh favoritmu?",
    options: [
      {
        label: "Kopi susu kekinian",
        icon: "fa-blender",
        scores: { p_houseblend: 3, p_robusta: 1 },
      },
      {
        label: "Manual brew (V60)",
        icon: "fa-filter",
        scores: { p_arabika_nat: 2, p_arabika_honey: 2 },
      },
      {
        label: "Tubruk ala rumahan",
        icon: "fa-mug-hot",
        scores: { p_robusta: 2, p_houseblend: 1 },
      },
      {
        label: "Tinggal seduh, praktis",
        icon: "fa-bag-shopping",
        scores: { p_dripbag: 3 },
      },
    ],
  },
];

const productInfo = {
  p_robusta: {
    name: "Robusta",
    desc: "Body tebal, pahit nendang, aroma earthy khas Sukodono.",
    icon: "fa-mountain",
  },
  p_arabika_nat: {
    name: "Arabika Natural",
    desc: "Rasa buah-buahan eksotis dari proses natural.",
    icon: "fa-lemon",
  },
  p_arabika_honey: {
    name: "Arabika Honey",
    desc: "Manis lembut & seimbang dengan lapisan mucilage alami.",
    icon: "fa-heart",
  },
  p_houseblend: {
    name: "House Blend",
    desc: "Racikan 70% Robusta : 30% Arabika untuk espresso kekinian.",
    icon: "fa-blender",
  },
  p_dripbag: {
    name: "Kopi Drip Bag",
    desc: "Solusi seduh kopi lezat dan paling praktis dimana saja.",
    icon: "fa-bag-shopping",
  },
};

let quizStep = 0;
let quizScores = {
  p_robusta: 0,
  p_arabika_nat: 0,
  p_arabika_honey: 0,
  p_houseblend: 0,
  p_dripbag: 0,
};

function loadQuizFromDatabase() {
  const container = document.getElementById("quiz-questions");
  if (!container) return;

  container.innerHTML = `<p class="text-gray-300 text-sm animate-pulse"><i class="fas fa-spinner fa-spin"></i> Memuat data Kopi Advisor...</p>`;

  fetch(`${DATABASE_URL}?action=getQuiz`)
    .then((res) => res.json())
    .then((resData) => {
      if (resData.status === "success" && resData.data) {
        try {
          quizData = JSON.parse(resData.data);
        } catch (e) {
          console.error("Gagal mem-parsing JSON kuis dari database.");
        }
      }
      renderQuizStep();
    })
    .catch((err) => {
      renderQuizStep();
    });
}

function renderQuizProgress() {
  const wrap = document.getElementById("quiz-progress");
  if (!wrap) return;
  wrap.innerHTML = "";
  quizData.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.className = "quiz-progress-dot" + (i <= quizStep ? " is-active" : "");
    wrap.appendChild(dot);
  });
}

function renderQuizStep() {
  const container = document.getElementById("quiz-questions");
  if (!container) return;
  renderQuizProgress();
  const step = quizData[quizStep];
  container.innerHTML = `<p class="text-base sm:text-lg font-semibold mb-4">${quizStep + 1}. ${step.question}</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">${step.options.map((opt, idx) => `<button type="button" class="quiz-option text-left flex items-center gap-3 bg-white/5 border border-white/15 rounded-xl px-4 py-3" data-opt-index="${idx}"><i class="fas ${opt.icon} text-sekarsa-tan w-4"></i><span class="text-xs sm:text-sm">${opt.label}</span></button>`).join("")}</div>`;
}

function selectQuizOption(idx) {
  const opt = quizData[quizStep].options[idx];
  for (const key in opt.scores)
    quizScores[key] = (quizScores[key] || 0) + opt.scores[key];
  quizStep++;
  if (quizStep < quizData.length) renderQuizStep();
  else showQuizResult();
}

function showQuizResult() {
  document.getElementById("quiz-questions").innerHTML = "";
  renderQuizProgress();
  let bestId = "p_robusta";
  let bestScore = -1;
  for (const key in quizScores) {
    if (quizScores[key] > bestScore) {
      bestScore = quizScores[key];
      bestId = key;
    }
  }

  const info = productInfo[bestId] || {
    name: bestId,
    desc: "Produk rekomendasi spesial untukmu.",
    icon: "fa-mug-hot",
  };

  const resultBox = document.getElementById("quiz-result");
  resultBox.classList.remove("hidden");
  resultBox.innerHTML = `<div class="bg-white/10 border border-white/20 rounded-2xl p-5 sm:p-8"><p class="text-[10px] sm:text-xs uppercase tracking-widest text-sekarsa-tan font-bold mb-2">Rekomendasi untukmu</p><div class="flex items-center gap-3 sm:gap-4 mb-4"><div class="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-sekarsa-tan/20 flex items-center justify-center flex-shrink-0"><i class="fas ${info.icon} text-lg sm:text-2xl text-sekarsa-tan"></i></div><h4 class="text-xl sm:text-2xl font-serif font-bold">${info.name}</h4></div><p class="text-xs sm:text-sm text-gray-300 mb-6">${info.desc}</p><div class="flex flex-col sm:flex-row gap-2 sm:gap-3"><button type="button" id="quiz-goto-product" class="flex-1 bg-sekarsa-tan text-sekarsa-dark text-xs sm:text-sm font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-white transition" data-goto="${bestId}">Lihat Produk</button><button type="button" id="quiz-restart" class="flex-1 border border-white/30 text-white text-xs sm:text-sm font-medium px-4 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-white/10 transition">Ulangi</button></div></div>`;
}

function restartQuiz() {
  quizStep = 0;
  quizScores = {
    p_robusta: 0,
    p_arabika_nat: 0,
    p_arabika_honey: 0,
    p_houseblend: 0,
    p_dripbag: 0,
  };
  const res = document.getElementById("quiz-result");
  if (res) {
    res.classList.add("hidden");
    res.innerHTML = "";
  }
  renderQuizStep();
}

function highlightProduct(productId) {
  window.location.href = `produk.html?highlight=${productId}`;
}

// --- TRACKING & LAINNYA ---
function saveMockOrder(orderData) {
  let orders = JSON.parse(localStorage.getItem("mockOrders") || "[]");
  orders.push({ date: new Date().toLocaleString("id-ID"), ...orderData });
  localStorage.setItem("mockOrders", JSON.stringify(orders));
}

function generateTrackingCode() {
  return (
    "SK-" +
    Math.floor(1000 + Math.random() * 9000) +
    Date.now().toString().slice(-4)
  );
}

function checkTracking() {
  let code = document.getElementById("tracking-input").value.trim();
  let resDiv = document.getElementById("tracking-result");
  if (!resDiv) return;
  resDiv.innerHTML = "Mencari...";
  fetch(`${DATABASE_URL}?action=track&kode=${code}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        let badgeColor = "bg-gray-200 text-gray-700";
        if (data.order.status_pesanan === "Diproses")
          badgeColor = "bg-blue-100 text-blue-700 border border-blue-200";
        if (data.order.status_pesanan === "Dikirim")
          badgeColor = "bg-yellow-100 text-yellow-700 border border-yellow-200";
        if (data.order.status_pesanan === "Selesai")
          badgeColor = "bg-green-100 text-green-700 border border-green-200";

        let bayarBtnHtml = "";
        if (
          data.order.total_bayar &&
          data.order.status_pesanan === "Menunggu Pembayaran"
        ) {
          bayarBtnHtml = `<button type="button" onclick="openPaymentModal('${code}')" class="mt-3 w-full bg-sekarsa-navy text-white py-2 rounded-lg text-xs font-bold hover:bg-sekarsa-dark transition shadow-sm"><i class="fas fa-qrcode mr-1.5"></i> Bayar Sekarang</button>`;
        }

        resDiv.innerHTML = `<div class="p-4 bg-gray-50 border border-gray-200 rounded-xl"><p class="text-[10px] sm:text-xs text-gray-500 mb-0.5">Pesanan Atas Nama:</p><p class="font-bold text-sekarsa-dark mb-3 text-sm sm:text-base">${data.order.nama}</p><p class="text-[10px] sm:text-xs text-gray-500 mb-1.5">Status Saat Ini:</p><span class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider inline-block ${badgeColor}">${data.order.status_pesanan}</span>${bayarBtnHtml}</div>`;
      } else {
        resDiv.innerHTML = `<p class="text-red-500 text-center font-medium text-sm bg-red-50 p-3 rounded-xl border border-red-100">${data.message}</p>`;
      }
    })
    .catch((err) => {
      resDiv.innerHTML = `<p class="text-red-500 text-center font-medium text-sm bg-red-50 p-3 rounded-xl border border-red-100">Gagal terhubung ke server.</p>`;
    });
}

// ==========================================================
// MODUL PEMBAYARAN QRIS & UPLOAD BUKTI (Dari payment.js)
// ==========================================================
const PAYMENT_CFG = {
  qrisImage: "elemen/qris.png",
  merchantName: "Sekarsa Kopi",
  maxUploadMB: 8,
  maxDimension: 1280,
};

let currentCode = null;
let proofDataUrl = null;
let forceUpload = false;

const paymentRp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const paymentEsc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

function readPaymentOrders() {
  try {
    return JSON.parse(localStorage.getItem("mockOrders") || "[]");
  } catch (e) {
    return [];
  }
}
function findPaymentOrder(code) {
  return readPaymentOrders().find((o) => o.kode_tracking === code);
}
function patchPaymentOrder(code, patch) {
  const all = readPaymentOrders();
  const i = all.findIndex((o) => o.kode_tracking === code);
  if (i > -1) {
    all[i] = { ...all[i], ...patch };
    localStorage.setItem("mockOrders", JSON.stringify(all));
  }
}

function ensurePaymentModal() {
  if (document.getElementById("payment-modal")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div id="payment-modal" class="hidden fixed inset-0 z-[170] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div class="bg-white w-full sm:max-w-md max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl relative">
        <div class="sticky top-0 z-10 flex items-center justify-between bg-sekarsa-navy text-white px-6 py-4">
          <div>
            <h3 id="payment-title" class="font-serif text-xl font-bold">Pembayaran</h3>
            <p id="payment-code" class="text-xs text-sekarsa-tan tracking-wider"></p>
          </div>
          <button id="payment-close" type="button" aria-label="Tutup" class="text-2xl leading-none text-gray-300 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-sekarsa-tan rounded">&times;</button>
        </div>
        <div id="payment-body" class="p-6"></div>
      </div>
    </div>`,
  );
  document
    .getElementById("payment-close")
    .addEventListener("click", closePaymentModal);
  document.getElementById("payment-modal").addEventListener("click", (e) => {
    if (e.target.id === "payment-modal") closePaymentModal();
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !document.getElementById("payment-modal").classList.contains("hidden")
    )
      closePaymentModal();
  });
}

function closePaymentModal() {
  const m = document.getElementById("payment-modal");
  if (m) m.classList.add("hidden");
  document.body.style.overflow = "";
}

function renderPaymentModalView() {
  const order = findPaymentOrder(currentCode);
  const body = document.getElementById("payment-body");
  if (!order || !body) return;
  const status = order.status_pesanan || "Menunggu Pembayaran";
  document.getElementById("payment-code").textContent =
    "Kode pesanan: " + currentCode;

  if (status === "Dibatalkan") {
    body.innerHTML = paymentStateBox(
      "fa-ban",
      "text-red-500 bg-red-50",
      "Pesanan dibatalkan",
      "Pesanan ini sudah dibatalkan. Hubungi kami lewat WhatsApp jika ini keliru.",
    );
    return;
  }
  if (["Diproses", "Dikirim", "Selesai"].includes(status)) {
    body.innerHTML = paymentStateBox(
      "fa-circle-check",
      "text-green-600 bg-green-50",
      "Pembayaran terverifikasi",
      `Pesanan Anda berstatus <b>${paymentEsc(status)}</b>. Pantau lewat menu Lacak Pesanan dengan kode di atas.`,
    );
    return;
  }
  if (status === "Menunggu Verifikasi" && !forceUpload) {
    body.innerHTML =
      paymentStateBox(
        "fa-hourglass-half",
        "text-purple-600 bg-purple-50",
        "Bukti diterima, menunggu verifikasi",
        "Kami akan mencocokkan pembayaran Anda. Status akan berubah otomatis di Lacak Pesanan setelah diverifikasi (jam layanan Senin–Jumat, 09.00–16.00 WIB).",
      ) +
      `<button id="pay-reupload" type="button" class="mt-4 w-full text-sm font-semibold text-sekarsa-ochre hover:text-sekarsa-dark underline">Salah unggah? Kirim ulang bukti</button>`;
    document.getElementById("pay-reupload").addEventListener("click", () => {
      forceUpload = true;
      renderPaymentModalView();
    });
    return;
  }
  renderPayView(order);
}

function paymentStateBox(icon, tone, title, text) {
  return `<div class="text-center py-6">
    <div class="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-4 ${tone}"><i class="fas ${icon}"></i></div>
    <h4 class="font-serif text-xl font-bold text-sekarsa-dark mb-2">${title}</h4>
    <p class="text-sm text-gray-500 leading-relaxed">${text}</p>
  </div>`;
}

function renderPayView(order) {
  const total = Number(order.total_bayar) || 0;
  const kodeUnik = Number(order.kode_unik) || 0;
  const subtotal = Number(order.subtotal) || total - kodeUnik;
  proofDataUrl = null;

  document.getElementById("payment-body").innerHTML = `
    <div class="rounded-2xl bg-sekarsa-tan/15 border border-sekarsa-tan/40 p-4 mb-5">
      <p class="text-xs text-gray-500 mb-1">Total yang harus dibayar</p>
      <div class="flex items-center justify-between gap-3">
        <span id="pay-total" class="text-3xl font-bold text-sekarsa-red">${paymentRp(total)}</span>
        <button id="pay-copy" type="button" class="text-xs font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-sekarsa-ochre transition">Salin nominal</button>
      </div>
      <p class="text-[11px] text-gray-500 mt-2 leading-relaxed">Pesanan ${paymentRp(subtotal)} + kode unik ${paymentRp(kodeUnik)}. Bayar <b>persis</b> sesuai nominal ini agar mudah kami cocokkan.</p>
    </div>

    <div class="text-center mb-5">
      <div class="inline-block bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
        <img id="pay-qris" src="${paymentEsc(PAYMENT_CFG.qrisImage)}" alt="Kode QRIS ${paymentEsc(PAYMENT_CFG.merchantName)}" class="w-60 h-60 object-contain mx-auto" />
        <div id="pay-qris-error" class="hidden w-60 h-60 flex items-center justify-center text-xs text-red-600 text-center px-4">Gambar QRIS belum dipasang. Hubungi admin lewat WhatsApp.</div>
      </div>
      <p class="text-xs text-gray-500 mt-2">${paymentEsc(PAYMENT_CFG.merchantName)} · Bisa dibayar dari semua bank &amp; e-wallet</p>
      <a href="${paymentEsc(PAYMENT_CFG.qrisImage)}" download="QRIS-Sekarsa-Kopi.png" class="inline-block mt-1 text-xs font-semibold text-sekarsa-ochre hover:underline">Unduh QRIS</a>
    </div>

    <ol class="text-xs text-gray-600 space-y-1.5 mb-5 list-decimal pl-5 leading-relaxed">
      <li>Buka aplikasi bank atau e-wallet, pilih Scan QRIS.</li>
      <li>Masukkan nominal <b>${paymentRp(total)}</b> jika belum terisi otomatis.</li>
      <li>Simpan screenshot bukti bayar, lalu unggah di bawah.</li>
    </ol>

    <label for="pay-proof" class="block text-xs font-semibold text-gray-700 mb-1.5">Bukti pembayaran</label>
    <input id="pay-proof" type="file" accept="image/*" class="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sekarsa-navy file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-white hover:file:bg-sekarsa-dark cursor-pointer" />
    <div id="pay-proof-preview" class="mt-3"></div>
    <p id="pay-error" class="hidden mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3" role="alert"></p>

    <button id="pay-submit" type="button" disabled class="mt-5 w-full bg-sekarsa-navy text-white py-3.5 rounded-xl font-bold text-sm hover:bg-sekarsa-dark transition disabled:opacity-40 disabled:cursor-not-allowed">Kirim bukti pembayaran</button>
    <p class="text-[11px] text-gray-400 text-center mt-3">Belum bisa bayar sekarang? Tutup saja. Buka lagi dari Profil Saya &rsaquo; Riwayat Pesanan.</p>`;

  document.getElementById("pay-qris").addEventListener("error", () => {
    document.getElementById("pay-qris").classList.add("hidden");
    document.getElementById("pay-qris-error").classList.remove("hidden");
  });
  document
    .getElementById("pay-copy")
    .addEventListener("click", () => copyPaymentText(String(total)));
  document
    .getElementById("pay-proof")
    .addEventListener("change", onProofSelected);
  document.getElementById("pay-submit").addEventListener("click", submitProof);
}

function copyPaymentText(text) {
  const done = () =>
    showSuccessToast("Tersalin", "Nominal pembayaran disalin.");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => {});
  } else {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand("copy");
      done();
    } catch (e) {}
    t.remove();
  }
}

function showPaymentError(msg) {
  const el = document.getElementById("pay-error");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
}

function compressPaymentImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(
        1,
        PAYMENT_CFG.maxDimension / Math.max(img.width, img.height),
      );
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Gambar tidak dapat dibaca. Gunakan file JPG, PNG, atau WebP.",
        ),
      );
    };
    img.src = url;
  });
}

async function onProofSelected(e) {
  const file = e.target.files[0];
  const btn = document.getElementById("pay-submit");
  const prev = document.getElementById("pay-proof-preview");
  proofDataUrl = null;
  btn.disabled = true;
  prev.innerHTML = "";
  showPaymentError("");
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showPaymentError("File harus berupa gambar (screenshot bukti bayar).");
    return;
  }
  if (file.size > PAYMENT_CFG.maxUploadMB * 1024 * 1024) {
    showPaymentError(`Ukuran file maksimal ${PAYMENT_CFG.maxUploadMB} MB.`);
    return;
  }
  try {
    proofDataUrl = await compressPaymentImage(file);
    prev.innerHTML = `<img src="${proofDataUrl}" alt="Pratinjau bukti pembayaran" class="max-h-48 rounded-xl border border-gray-200 mx-auto" />`;
    btn.disabled = false;
  } catch (err) {
    showPaymentError(err.message);
  }
}

function submitProof() {
  if (!proofDataUrl) return;
  const btn = document.getElementById("pay-submit");
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Mengirim...';
  showPaymentError("");

  fetch(DATABASE_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "uploadBukti",
      kode_tracking: currentCode,
      mime: "image/jpeg",
      data: proofDataUrl.split(",")[1],
    }),
  })
    .then((r) => r.json())
    .then((res) => {
      if (res.status !== "success")
        throw new Error(res.message || "Gagal mengunggah bukti.");
      patchPaymentOrder(currentCode, { status_pesanan: "Menunggu Verifikasi" });
      forceUpload = false;
      showSuccessToast(
        "Bukti terkirim",
        "Pembayaran Anda akan segera diverifikasi.",
      );
      renderPaymentModalView();
    })
    .catch((err) => {
      showPaymentError(
        (err && err.message) ||
          "Gagal terhubung ke server. Periksa koneksi lalu coba lagi.",
      );
      btn.disabled = false;
      btn.innerHTML = label;
    });
}

function syncPaymentStatus(code) {
  return fetch(`${DATABASE_URL}?action=track&kode=${encodeURIComponent(code)}`)
    .then((r) => r.json())
    .then((d) => {
      if (d.status === "success" && d.order && d.order.status_pesanan) {
        const local = findPaymentOrder(code);
        if (local && local.status_pesanan !== d.order.status_pesanan) {
          patchPaymentOrder(code, { status_pesanan: d.order.status_pesanan });
        }
      }
    })
    .catch(() => {});
}

window.openPaymentModal = function (code) {
  const order = findPaymentOrder(code);
  if (!order) {
    showSuccessToast(
      "Data tidak ditemukan",
      "Pesanan ini tidak punya data pembayaran di perangkat ini.",
    );
    return;
  }
  ensurePaymentModal();
  currentCode = code;
  forceUpload = false;
  renderPaymentModalView();
  document.getElementById("payment-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("payment-close").focus();
  syncPaymentStatus(code).then(() => {
    if (
      currentCode === code &&
      !document.getElementById("payment-modal").classList.contains("hidden")
    )
      renderPaymentModalView();
  });
};
// ==========================================================

document.addEventListener("click", (e) => {
  const btnShare = e.target.closest(".btn-share");
  if (btnShare) {
    e.preventDefault();
    e.stopPropagation();
    const title = btnShare.getAttribute("data-title") || "Sekarsa Kopi";
    const text =
      btnShare.getAttribute("data-text") ||
      "Cek produk dan artikel menarik dari Sekarsa Kopi!";
    let url = btnShare.getAttribute("data-url");
    url = url
      ? "https://sekarsakopi.my.id/" + url
      : "https://sekarsakopi.my.id/";
    if (navigator.share && window.innerWidth < 1024) {
      navigator
        .share({ title: title, text: text, url: url })
        .catch((error) => console.log("Share error:", error));
    }
  }
  const btnPlus = e.target.closest(".btn-qty-plus");
  if (btnPlus) {
    const idStr = btnPlus.getAttribute("data-id");
    if (idStr) {
      const qtyEl = document.getElementById("qty-" + idStr);
      qtyEl.innerText = parseInt(qtyEl.innerText) + 1;
    }
  }
  const btnMin = e.target.closest(".btn-qty-min");
  if (btnMin) {
    const idStr = btnMin.getAttribute("data-id");
    if (idStr) {
      const qtyEl = document.getElementById("qty-" + idStr);
      let currentQty = parseInt(qtyEl.innerText);
      if (currentQty > 0) qtyEl.innerText = currentQty - 1;
    }
  }

  // LOGIKA PENAMBAHAN KE KERANJANG
  const btnTambah = e.target.closest(".btn-tambah-cart");
  if (btnTambah) {
    const id = btnTambah.getAttribute("data-id");
    const baseName = btnTambah.getAttribute("data-base-name");
    const price = parseInt(btnTambah.getAttribute("data-harga"));
    const qtyInput = parseInt(document.getElementById("qty-" + id).innerText);
    const cardWrapper = btnTambah.closest(".product-card");
    const roastSelect = cardWrapper.querySelector(".roast-input");
    const sizeSelect = cardWrapper.querySelector(".size-input");
    const bentukSelect = cardWrapper.querySelector(".bentuk-input");
    const roastLevel = roastSelect ? roastSelect.value : null;
    const sizeLevel = sizeSelect ? sizeSelect.value : null;
    const bentukLevel = bentukSelect ? bentukSelect.value : null;
    const cartKey =
      `${id}-${bentukLevel || ""}-${sizeLevel || ""}-${roastLevel || ""}`.replace(
        /\s+/g,
        "",
      );
    if (qtyInput > 0) {
      cart[cartKey] = {
        id: id,
        name: baseName,
        price: price,
        qty: qtyInput,
        roast: roastLevel,
        size: sizeLevel,
        bentuk: bentukLevel,
      };
      showSuccessToast(
        "Berhasil ditambahkan!",
        `${baseName} masuk keranjang Anda.`,
      );
    } else {
      delete cart[cartKey];
    }

    localStorage.setItem("tempCart", JSON.stringify(cart));
    updateCartUI();
  }

  const btnHapusItem = e.target.closest(".btn-hapus-item");
  if (btnHapusItem) {
    const cartKey = btnHapusItem.getAttribute("data-cart-key");
    if (cart[cartKey]) {
      const productId = cart[cartKey].id;
      delete cart[cartKey];

      localStorage.setItem("tempCart", JSON.stringify(cart));
      updateCartUI();

      const qtyEl = document.getElementById("qty-" + productId);
      if (qtyEl) qtyEl.innerText = "0";
      showSuccessToast("Dihapus!", "Produk dihapus dari keranjang.");
    }
  }

  const btnCheckoutWeb = e.target.closest("#btn-checkout-web");
  if (btnCheckoutWeb) {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem("userSession"));
    if (!currentUser) {
      toggleCart();
      showSuccessToast("Perhatian", "Anda harus Login/Daftar sebelum memesan.");
      setTimeout(() => toggleAuthModal(), 800);
      return;
    }
    localStorage.setItem("tempCart", JSON.stringify(cart));
    window.location.href = "kontak.html";
  }
  const quizOption = e.target.closest(".quiz-option");
  if (quizOption)
    selectQuizOption(parseInt(quizOption.getAttribute("data-opt-index")));
  const quizRestart = e.target.closest("#quiz-restart");
  if (quizRestart) restartQuiz();
  const quizGoto = e.target.closest("#quiz-goto-product");
  if (quizGoto) highlightProduct(quizGoto.getAttribute("data-goto"));
});

function submitContactForm(event) {
  event.preventDefault();
  const form = document.getElementById("contact-form");
  const submitBtn = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const alamatLengkap = `${form.querySelector('[name="Alamat_Lengkap"]').value}, Kec. ${form.querySelector('[name="Kecamatan"]').value}, ${form.querySelector('[name="Kota_Kabupaten"]').value}, ${form.querySelector('[name="Provinsi"]').value} ${form.querySelector('[name="Kode_Pos"]').value}`;
  const trackingCode = generateTrackingCode();

  // Hitung total bayar (termasuk kode unik acak 3 digit agar mudah diverifikasi)
  const subtotalText = document.getElementById("order-summary-total")
    ? document.getElementById("order-summary-total").innerText
    : "Rp 0";
  const rawSubtotal = parseInt(subtotalText.replace(/[^0-9]/g, "")) || 0;
  const kodeUnik = Math.floor(100 + Math.random() * 900); // 3 digit acak
  const totalBayar = rawSubtotal + kodeUnik;

  const orderData = {
    nama: form.querySelector('[name="Nama"]').value,
    telepon: form.querySelector('[name="Telepon"]').value,
    alamat: alamatLengkap,
    keperluan: form.querySelector('[name="Keperluan"]').value,
    pesan: form.querySelector('[name="Pesan"]').value,
    cartItems: Object.values(cart).filter((item) => item.qty > 0),
    totalHarga: formatRupiah(rawSubtotal),
    subtotal: rawSubtotal,
    kode_unik: kodeUnik,
    total_bayar: totalBayar,
    kode_tracking: trackingCode,
    status_pesanan: "Menunggu Pembayaran",
  };
  saveMockOrder(orderData);
  let isOrder = orderData.cartItems.length > 0;
  let payload = {};

  if (isOrder) {
    let rincian = orderData.cartItems
      .map(
        (i) =>
          `${i.qty}x ${i.name} (${i.bentuk || ""}, ${i.size || ""}, ${i.roast || ""}) - Rp${i.price}`,
      )
      .join("\n");
    payload = {
      action: "order",
      kode_tracking: trackingCode,
      nama: orderData.nama,
      telepon: orderData.telepon,
      alamat: orderData.alamat,
      rincian_pesanan: rincian + "\n\nCatatan: " + orderData.pesan,
      total: orderData.totalHarga,
      total_bayar: totalBayar,
    };
  } else {
    payload = {
      action: "kontak",
      nama: orderData.nama,
      telepon: orderData.telepon,
      keperluan: orderData.keperluan,
      pesan: orderData.pesan,
    };
  }

  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.classList.add("opacity-80", "cursor-wait");
  submitBtn.innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Mengirim...';

  fetch(DATABASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((response) => response.json())
    .then((data) => {
      if (isOrder) {
        showSuccessToast(
          "Pesanan Diterima!",
          `Kode Pelacakan: ${trackingCode}. Membuka QRIS Pembayaran...`,
        );
        resetContactFormAndCart(form);
        setTimeout(() => {
          openPaymentModal(trackingCode);
        }, 1200);
      } else {
        showSuccessToast(
          "Pesan Diterima!",
          "Terima kasih telah menghubungi kami.",
        );
        resetContactFormAndCart(form);
      }
    })
    .catch((error) => {
      showSuccessToast(
        "Pesanan Tersimpan (Offline)",
        "Membuka QRIS Pembayaran...",
      );
      resetContactFormAndCart(form);
      if (isOrder) {
        setTimeout(() => {
          openPaymentModal(trackingCode);
        }, 1200);
      }
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-80", "cursor-wait");
      submitBtn.innerHTML = originalBtnHtml;
    });
}

function resetContactFormAndCart(form) {
  form.reset();
  const currentUser = JSON.parse(localStorage.getItem("userSession"));
  if (currentUser) {
    const namaInput = form.querySelector('[name="Nama"]');
    const telpInput = form.querySelector('[name="Telepon"]');
    if (namaInput) namaInput.value = currentUser.nama;
    if (telpInput) telpInput.value = currentUser.hp;
  }
  cart = {};
  localStorage.removeItem("tempCart");
  updateCartUI();
  if (document.getElementById("order-summary-box"))
    document.getElementById("order-summary-box").classList.add("hidden");
}

function loadReviews() {
  const container = document.getElementById("reviews-container");
  if (!container) return;
  fetch(`${DATABASE_URL}?action=getUlasan`)
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success" && data.data.length > 0) {
        container.innerHTML = "";
        const latestReviews = data.data.slice(0, 6).reverse();
        latestReviews.forEach((item, index) => {
          let starsHtml = "";
          const rating = parseInt(item.rating) || 5;
          for (let i = 0; i < 5; i++) {
            starsHtml +=
              i < rating
                ? '<i class="fas fa-star"></i>'
                : '<i class="far fa-star text-gray-300"></i>';
          }
          const initial = item.nama ? item.nama.charAt(0).toUpperCase() : "S";
          const delay = index * 100;
          const colors = [
            "bg-sekarsa-navy",
            "bg-sekarsa-ochre",
            "bg-sekarsa-red",
            "bg-sekarsa-blue",
            "bg-sekarsa-dark",
          ];
          const bgColor = colors[index % colors.length];
          const reviewHtml = `<div class="reveal bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full hover:shadow-xl transition-shadow transform hover:-translate-y-1 is-visible" style="transition-delay: ${delay}ms"><div class="flex text-yellow-400 mb-3 sm:mb-4 text-base sm:text-lg gap-1">${starsHtml}</div><p class="text-gray-600 italic mb-5 sm:mb-6 flex-grow text-sm sm:text-base">"${item.ulasan}"</p><div class="flex items-center gap-3 sm:gap-4 mt-auto"><div class="w-10 h-10 rounded-full ${bgColor} text-white flex items-center justify-center font-bold">${initial}</div><div><h5 class="font-bold text-sekarsa-dark text-xs sm:text-sm">${item.nama}</h5><p class="text-[10px] sm:text-xs text-gray-400">Pelanggan Sekarsa</p></div></div></div>`;
          container.insertAdjacentHTML("beforeend", reviewHtml);
        });
      } else {
        container.innerHTML =
          '<p class="text-gray-500 italic col-span-full text-center text-sm sm:text-base">Belum ada ulasan pelanggan.</p>';
      }
    })
    .catch((error) => console.log("Gagal memuat ulasan online"));
}

function submitReview(event) {
  event.preventDefault();
  const nameInput = document.getElementById("review-name").value;
  const textInput = document.getElementById("review-text").value;
  const ratingInput = document.querySelector('input[name="rating"]:checked');
  const submitBtn = event.currentTarget;
  if (!nameInput || !textInput) {
    showSuccessToast(
      "Belum Lengkap",
      "Mohon isi nama dan ulasan Anda terlebih dahulu.",
    );
    return;
  }
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.classList.add("opacity-80", "cursor-wait");
  submitBtn.innerHTML =
    '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
  const rating = ratingInput ? parseInt(ratingInput.value) : 5;
  fetch(DATABASE_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "ulasan",
      nama: nameInput,
      rating: rating,
      ulasan: textInput,
    }),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success") {
        document.getElementById("review-form").reset();
        showSuccessToast(
          "Tersimpan!",
          "Ulasan Anda telah masuk ke sistem kami.",
        );
        loadReviews();
      }
    })
    .catch((error) =>
      showSuccessToast("Koneksi Gagal", "Pastikan internet Anda stabil."),
    )
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.classList.remove("opacity-80", "cursor-wait");
      submitBtn.innerHTML = originalBtnHtml;
    });
}

function renderDynamicProducts() {
  const container = document.getElementById("katalog-produk-container");
  if (!container) return;
  container.innerHTML = `<div class="col-span-full text-center py-16"><i class="fas fa-circle-notch fa-spin text-5xl text-sekarsa-tan mb-4"></i><p class="text-gray-500 font-medium">Memuat katalog produk spesial...</p></div>`;
  fetch(`${DATABASE_URL}?action=getProduk`)
    .then((res) => res.json())
    .then((resData) => {
      const products = resData.data || [];
      if (products.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-gray-500">Katalog Sedang Diperbarui.</p></div>`;
        return;
      }
      container.innerHTML = "";

      products.forEach((prod, index) => {
        let priceData;
        try {
          priceData = JSON.parse(prod.price);
        } catch (e) {
          priceData = {
            tipe: "dripbag",
            harga: parseInt(prod.price) || 0,
            diskon: 0,
          };
        }

        let variantHTML = "";
        let displayPrice = "";
        let diskonVal = priceData.diskon || 0;

        if (priceData.tipe === "kopi") {
          const h = priceData.harga;
          displayPrice = `Rp ${(h.bubuk200 || 0).toLocaleString("id-ID")}`;
          variantHTML = `<div class="space-y-3 mb-6"><div><label class="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-1">Bentuk Kopi:</label><select class="bentuk-input w-full border border-gray-200 rounded-lg p-2 text-xs sm:text-sm outline-none focus:border-sekarsa-ochre bg-gray-50"><option value="Bubuk" selected>Bubuk</option><option value="Beans">Beans (Biji Sangrai)</option></select></div><div><label class="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-1">Ukuran:</label><select class="size-input w-full border border-gray-200 rounded-lg p-2 text-xs sm:text-sm outline-none focus:border-sekarsa-ochre bg-gray-50"><option value="200 Gram" data-price-bubuk="${h.bubuk200}" data-price-beans="${h.beans200}">200 Gram</option><option value="500 Gram" data-price-bubuk="${h.bubuk500}" data-price-beans="${h.beans500}">500 Gram</option><option value="1000 Gram" data-price-bubuk="${h.bubuk1000}" data-price-beans="${h.beans1000}">1000 Gram</option></select></div><div><label class="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-1">Roast Level:</label><select class="roast-input w-full border border-gray-200 rounded-lg p-2 text-xs sm:text-sm outline-none focus:border-sekarsa-ochre bg-gray-50"><option value="Light">Light</option><option value="Light to Medium" selected>Light to Medium</option><option value="Medium">Medium</option><option value="Medium to Dark">Medium to Dark</option><option value="Dark">Dark</option></select></div></div>`;
        } else {
          displayPrice = `Rp ${(priceData.harga || 0).toLocaleString("id-ID")}`;
          variantHTML = `<div class="space-y-3 mb-6"><div><label class="block text-[10px] sm:text-xs font-semibold text-gray-500 mb-1">Ukuran (Isi):</label><select class="size-input w-full border border-gray-200 rounded-lg p-2 text-xs sm:text-sm outline-none focus:border-sekarsa-ochre bg-gray-50"><option value="Isi 5 Pcs" data-price="${priceData.harga}">Box (Isi 5 Pcs)</option></select></div></div>`;
        }

        let images = [];
        try {
          images = JSON.parse(prod.img);
        } catch (e) {
          images = [prod.img];
        }

        let swiperSlides = images
          .map(
            (url) =>
              `<div class="swiper-slide w-full h-full bg-gray-200">
             <img src="${url}" alt="${prod.name}" class="w-full h-full object-cover group-hover:scale-110 transition duration-700 ease-in-out" loading="lazy">
           </div>`,
          )
          .join("");

        const sliderHTML = `
          <div class="swiper swiper-katalog-${index} w-full h-full rounded-t-3xl overflow-hidden">
            <div class="swiper-wrapper h-full w-full">
              ${swiperSlides}
            </div>
            ${images.length > 1 ? `<div class="swiper-pagination"></div><div class="swiper-button-next !text-white opacity-0 group-hover:opacity-100 transition duration-300 drop-shadow-md scale-75"></div><div class="swiper-button-prev !text-white opacity-0 group-hover:opacity-100 transition duration-300 drop-shadow-md scale-75"></div>` : ""}
          </div>
        `;

        const delay = index * 100;
        const cardHTML = `<div class="reveal is-visible bg-white rounded-3xl shadow-xl border border-gray-100 group flex flex-col product-card relative transform transition hover:-translate-y-2" data-product-id="${prod.id}" data-diskon="${diskonVal}" style="animation: fadeInUp 0.6s ease forwards ${delay}ms; opacity: 0;"><div class="h-44 sm:h-48 relative overflow-hidden rounded-t-3xl">${sliderHTML}</div><div class="p-5 sm:p-6 flex flex-col flex-grow"><h3 class="text-lg sm:text-xl font-bold text-sekarsa-dark mb-2 font-serif nama-produk">${prod.name}</h3><p class="text-gray-600 mb-4 text-xs sm:text-sm flex-grow leading-relaxed line-clamp-3">${prod.desc}</p>${variantHTML}<div class="mb-6 h-12 flex items-end price-display-container"><div class="price-display w-full"><span class="text-lg sm:text-2xl font-bold text-sekarsa-red">${displayPrice}</span></div></div><div class="flex items-center justify-between gap-2 mt-auto action-row"><div class="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-gray-50 shadow-inner"><button class="btn-qty-min px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-200 transition font-bold" data-id="${prod.id}">-</button><span id="qty-${prod.id}" class="px-2 sm:px-3 font-semibold text-sekarsa-dark text-sm sm:text-base">0</span><button class="btn-qty-plus px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-200 transition font-bold" data-id="${prod.id}">+</button></div><button class="btn-tambah-cart flex-1 bg-sekarsa-dark text-white py-2.5 rounded-lg text-xs sm:text-sm font-bold hover:bg-sekarsa-navy transition shadow-md" data-id="${prod.id}" data-base-name="${prod.name}">Tambah</button></div></div></div>`;
        container.insertAdjacentHTML("beforeend", cardHTML);
      });

      attachPriceUpdateLogic();

      if (typeof Swiper !== "undefined") {
        products.forEach((prod, index) => {
          if (document.querySelector(`.swiper-katalog-${index}`)) {
            new Swiper(`.swiper-katalog-${index}`, {
              pagination: { el: ".swiper-pagination", dynamicBullets: true },
              navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
              },
              loop: true,
              nested: true,
            });
          }
        });
      }
    })
    .catch((err) => {
      container.innerHTML = `<div class="col-span-full text-center py-10 bg-red-50 rounded-3xl border border-red-100"><p class="text-red-600 font-medium">Gagal terhubung ke database.</p></div>`;
    });
}

function attachPriceUpdateLogic() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const sizeSelect = card.querySelector(".size-input");
    const bentukSelect = card.querySelector(".bentuk-input");
    const priceDisplay = card.querySelector(".price-display");
    const btnTambah = card.querySelector(".btn-tambah-cart");
    const diskonPerItem = parseInt(card.getAttribute("data-diskon")) || 0;

    function updatePrice() {
      if (!sizeSelect) return;
      const selectedSize = sizeSelect.options[sizeSelect.selectedIndex];
      let price = selectedSize.getAttribute("data-price");

      if (bentukSelect) {
        const bentuk = bentukSelect.value.toLowerCase();
        const specificPrice = selectedSize.getAttribute("data-price-" + bentuk);
        if (specificPrice) price = specificPrice;
      }

      price = parseInt(price || 0);

      if (price === 0) {
        priceDisplay.innerHTML =
          '<span class="text-sm font-bold text-gray-500">Stok Habis</span>';
      } else {
        const normalPrice = price + diskonPerItem;

        if (diskonPerItem > 0) {
          priceDisplay.innerHTML = `<div class="flex flex-col"><span class="text-xs text-gray-400 line-through font-medium leading-tight ml-1">${formatRupiah(normalPrice)}</span><div class="text-lg sm:text-2xl font-bold text-sekarsa-red flex items-center gap-2">${formatRupiah(price)}</div></div>`;
        } else {
          priceDisplay.innerHTML = `<span class="text-lg sm:text-2xl font-bold text-sekarsa-dark">${formatRupiah(price)}</span>`;
        }

        if (btnTambah) btnTambah.setAttribute("data-harga", price);
      }
    }

    if (sizeSelect) sizeSelect.addEventListener("change", updatePrice);
    if (bentukSelect) bentukSelect.addEventListener("change", updatePrice);

    updatePrice();
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 },
);
document
  .querySelectorAll(".reveal")
  .forEach((el) => revealObserver.observe(el));

function animateCounter(el) {
  const target = parseInt(el.getAttribute("data-target"), 10);
  const suffix = el.getAttribute("data-suffix") || "";
  const duration = 1200;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(progress * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(step);
}
const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 },
);
document
  .querySelectorAll(".stat-number")
  .forEach((el) => statObserver.observe(el));

const navbarEl = document.getElementById("main-navbar");
if (navbarEl) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) navbarEl.classList.add("shadow-xl");
    else navbarEl.classList.remove("shadow-xl");
  });
}

const scrollProgressEl = document.getElementById("scroll-progress");
function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  if (scrollProgressEl) scrollProgressEl.style.width = pct + "%";
}
window.addEventListener("scroll", updateScrollProgress);
updateScrollProgress();

function spawnCoffeeBeans() {
  const beanCount = 10;
  for (let i = 0; i < beanCount; i++) {
    const bean = document.createElement("i");
    bean.className = "fas fa-circle toast-bean";
    const angle = (Math.PI / (beanCount - 1)) * i - Math.PI / 2;
    const distance = 70 + Math.random() * 40;
    bean.style.setProperty(
      "--bx",
      `calc(-50% + ${Math.cos(angle) * distance}px)`,
    );
    bean.style.setProperty("--by", `${Math.sin(angle) * distance - 40}px`);
    bean.style.animationDelay = Math.random() * 0.15 + "s";
    document.body.appendChild(bean);
    setTimeout(() => bean.remove(), 1200);
  }
}

function showSuccessToast(title, message) {
  const toast = document.getElementById("success-toast");
  if (!toast) return;
  document.getElementById("toast-title").textContent = title;
  document.getElementById("toast-message").textContent = message;
  spawnCoffeeBeans();
  toast.classList.add("toast-show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(
    () => toast.classList.remove("toast-show"),
    3200,
  );
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-loaded");
  checkUserSession();
  loadReviews();

  loadQuizFromDatabase();
  renderDynamicProducts();
  updateCartUI();

  const urlParams = new URLSearchParams(window.location.search);
  const highlightId = urlParams.get("highlight");
  if (highlightId) {
    setTimeout(() => {
      const card = document.querySelector(
        `.product-card[data-product-id="${highlightId}"]`,
      );
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("highlight-pulse");
        setTimeout(() => card.classList.remove("highlight-pulse"), 2200);
      }
    }, 800);
  }
});
