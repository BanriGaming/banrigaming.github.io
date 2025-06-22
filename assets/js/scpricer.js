let items = [];
let orderLines = [];

async function loadItems() {
    const res = await fetch('https://banrigaming.github.io/assets/json/scpricer.json');
    items = await res.json();
    addOrderLine(); // start with one line
}

function addOrderLine() {
    const index = orderLines.length;
    orderLines.push({ itemIndex: null, quantity: 0 });

    const container = document.getElementById('order-lines');

    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center mb-2';
    row.dataset.index = index;

    // Dropdown for item
    const select = document.createElement('select');
    select.className = 'border p-1 w-64 bg-dark';
    select.innerHTML = `<option value="">Select an item...</option>` +
        items.map((item, i) =>
            `<option value="${i}">${item.item}</option>`
        ).join('');
    select.addEventListener('change', () => {
        orderLines[index].itemIndex = parseInt(select.value);
        updateLine(row, index);
        updateTotals();
    });

    // Quantity input
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '0';
    qtyInput.className = 'border p-1 w-20 text-center bg-dark';
    qtyInput.addEventListener('input', () => {
        orderLines[index].quantity = parseInt(qtyInput.value) || 0;
        updateLine(row, index);
        updateTotals();
    });

    // Price + total displays
    const priceDisplay = document.createElement('div');
    const totalDisplay = document.createElement('div');
    priceDisplay.className = 'w-32 text-right';
    totalDisplay.className = 'w-40 text-right font-semibold';

    row.appendChild(select);
    row.appendChild(qtyInput);
    row.appendChild(priceDisplay);
    row.appendChild(totalDisplay);

    container.appendChild(row);
}

function updateLine(row, index) {
    const data = orderLines[index];
    const priceEl = row.children[2];
    const totalEl = row.children[3];

    if (data.itemIndex !== null) {
        const item = items[data.itemIndex];
        const price = item.sellPrice;
        const total = price * data.quantity;

        priceEl.textContent = `¤${price.toLocaleString()}`;
        totalEl.textContent = `¤${total.toLocaleString()}`;
    } else {
        priceEl.textContent = '';
        totalEl.textContent = '';
    }
}

function updateTotals() {
    let subtotal = 0;

    orderLines.forEach(line => {
        if (line.itemIndex !== null && line.quantity > 0) {
            const item = items[line.itemIndex];
            subtotal += item.sellPrice * line.quantity;
        }
    });

    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const delivery = document.getElementById('delivery').value;
    const deliveryFee = delivery === 'Stanton' ? 200000 : delivery === 'Pyro' ? 350000 : 0;

    const discounted = subtotal - (subtotal * discount / 100);
    const final = discounted + deliveryFee;

    document.getElementById('subtotal').textContent = `¤${subtotal.toLocaleString()}`;
    document.getElementById('final-total').textContent = `¤${final.toLocaleString()}`;
}

document.getElementById('add-line').addEventListener('click', () => {
    addOrderLine();
});

document.getElementById('discount').addEventListener('input', updateTotals);
document.getElementById('delivery').addEventListener('change', updateTotals);

document.getElementById('generateImage').addEventListener('click', () => {
    const receipt = document.getElementById('receipt');
    const preview = document.getElementById('imagePreview');

    // Clear and hide previous image
    preview.innerHTML = '';
    preview.style.display = 'none'; // ✅ make sure it's hidden

    let html = `<h2 class="fs-4 font-bold mb-5">Banlonant Emporium Receipt</h2>`;
    html += `<table class="bg-dark w-full mb-4 border border-collapse text-center align-middles fs-6">
    <thead><tr>
      <th class="border pb-3 text-center align-middle">Item</th>
      <th class="border pb-3 text-center align-middle">Qty</th>
      <th class="border pb-3 text-center align-middle">Price</th>
      <th class="border pb-3 text-center align-middle">Total</th>
    </tr></thead><tbody>`;

    let subtotal = 0;

    orderLines.forEach(line => {
        if (line.itemIndex !== null && line.quantity > 0) {
            const item = items[line.itemIndex];
            const qty = line.quantity;
            const price = item.sellPrice;
            const total = price * qty;
            subtotal += total;

            html += `<tr>
    <td class="border pb-3 align-middle">${item.item}</td>
    <td class="border pb-3 align-middle">${qty}</td>
    <td class="border pb-3 align-middle">¤${price.toLocaleString()}</td>
    <td class="border pb-3 align-middle">¤${total.toLocaleString()}</td>

      </tr>`;
        }
    });

    const discount = parseFloat(document.getElementById('discount').value) || 0;
    const delivery = document.getElementById('delivery').value;
    const deliveryFee = delivery === 'Stanton' ? 200000 : delivery === 'Pyro' ? 350000 : 0;
    const discounted = subtotal - (subtotal * discount / 100);
    const final = discounted + deliveryFee;

    html += `</tbody></table>
    <div class="text-left font-semibold space-y-1">
      <p>Total: ¤${subtotal.toLocaleString()}</p>
      <p>Discount: ${discount}%</p>
      <p class="mb-3">Delivery: ${deliveryFee > 0 ? `¤${deliveryFee.toLocaleString()} (${delivery})` : 'None'}</p>
      <p class="fs-6">Final Total: ¤${final.toLocaleString()}</p>
    </div>`;

    receipt.innerHTML = html;
    receipt.style.display = 'block';

    html2canvas(receipt, { scale: 2 }).then(canvas => {
        receipt.style.display = 'none'; // ✅ hide the receipt again

        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        img.className = 'mt-4 border';

        preview.innerHTML = '';
        preview.appendChild(img);
        preview.style.display = 'block'; // ✅ reveal the image preview now

        img.scrollIntoView({ behavior: 'smooth' });
    });
});

// ✅ Group items by category (e.g., Shields, Weapons, etc.)
function groupItemsByCategory(items) {
    const groups = {};
    items.forEach((item, i) => {
        const category = item.category || 'Uncategorized';
        if (!groups[category]) groups[category] = [];
        // Add index so we can track which one is selected
        groups[category].push({ ...item, index: i });
    });
    return groups;
}

// ✅ Create dropdown with optgroups based on category
const groups = groupItemsByCategory(items);

const select = document.createElement('select');
select.className = 'border p-1 w-64 bg-dark';
select.innerHTML = `<option value="">Select an item...</option>`;

// ✅ Append grouped options to the dropdown
for (const category in groups) {
    const optGroup = document.createElement('optgroup');
    optGroup.label = category;
    groups[category].forEach(item => {
        const option = document.createElement('option');
        option.value = item.index;
        // ✅ Include size in label
        option.textContent = `${item.item} (Size ${item.size})`;
        optGroup.appendChild(option);
    });
    select.appendChild(optGroup);
}

// ✅ Prevent selecting the same item more than once
select.addEventListener('change', () => {
    const selectedValue = parseInt(select.value);
    const alreadyUsed = orderLines.some((line, i) => line.itemIndex === selectedValue && i !== index);
    if (alreadyUsed) {
        alert("This item is already selected in another line.");
        select.value = "";
        return;
    }
    orderLines[index].itemIndex = selectedValue;
    updateLine(row, index);
    updateTotals();
});


loadItems();
