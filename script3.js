// ===============================
// GLOBAL STATE
// ===============================
let currentUser = null;
let userType = null;
let products = [];

// ===============================
// SAMPLE PRODUCTS
// ===============================
const sampleProducts = [
    {
        id: 1,
        name: "Fresh Tomatoes",
        quantity: 50,
        pricePerUnit: 350,
        location: "Pune",
        farmerName: "Ramesh Kumar",
        farmerPhone: "9876543210",
        image: "🍅"
    },
    {
        id: 2,
        name: "Organic Wheat",
        quantity: 100,
        pricePerUnit: 280,
        location: "Nashik",
        farmerName: "Suresh Patil",
        farmerPhone: "9876543211",
        image: "🌾"
    }
];

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", function () {

    products = [...sampleProducts];

    // Switch buttons
    const farmerBtn = document.getElementById("farmerBtn");
    const merchantBtn = document.getElementById("merchantBtn");

    if (farmerBtn) {
        farmerBtn.addEventListener("click", () => switchView("farmer"));
    }

    if (merchantBtn) {
        merchantBtn.addEventListener("click", () => switchView("merchant"));
    }

    // Login forms → Redirect to index.html
    const farmerForm = document.getElementById("farmerLoginForm");
    const merchantForm = document.getElementById("merchantLoginForm");

    if (farmerForm) {
        farmerForm.addEventListener("submit", function (e) {
            e.preventDefault();
            window.location.href = "index.html";
        });
    }

    if (merchantForm) {
        merchantForm.addEventListener("submit", function (e) {
            e.preventDefault();
            window.location.href = "index.html";
        });
    }

});

// ===============================
// SWITCH VIEW
// ===============================
function switchView(view) {
    const farmerSection = document.getElementById("farmerSection");
    const merchantSection = document.getElementById("merchantSection");

    if (!farmerSection || !merchantSection) return;

    if (view === "farmer") {
        farmerSection.classList.add("active");
        merchantSection.classList.remove("active");
    } else {
        merchantSection.classList.add("active");
        farmerSection.classList.remove("active");
    }
}

// ===============================
// CREATE PRODUCT CARD
// ===============================
function createProductCard(product) {
    return `
        <div class="product-card">
            <div class="product-image">${product.image}</div>
            <h3>${product.name}</h3>
            <p>Available: ${product.quantity} kg</p>
            <p>Location: ${product.location}</p>
            <p>Price: ₹${product.pricePerUnit} / 10kg</p>
        </div>
    `;
}