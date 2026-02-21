async function loadPrices()
{

const grid =
document.getElementById("priceGrid");


grid.innerHTML =
"<p>Loading prices...</p>";


try
{

const response =
await fetch("http://127.0.0.1:8000/prices");


const data =
await response.json();


grid.innerHTML = "";


data.forEach(item =>
{

const card =
document.createElement("div");


card.className = "product-card";


card.innerHTML =
`
<div class="product-info">

<div class="product-name">
${item.commodity}
</div>

<div class="product-details">

<p>Market: ${item.market}</p>

<p>District: ${item.district}</p>

<p>State: ${item.state}</p>

</div>

<div class="product-price">

₹ ${item.modal_price}

</div>

</div>
`;


grid.appendChild(card);

});


}
catch(error)
{

grid.innerHTML =
"<p>Failed to load price data</p>";

console.error(error);

}

}


loadPrices();