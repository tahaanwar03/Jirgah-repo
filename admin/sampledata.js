// sampledata.js — Jirgah Admin Panel Fallback Data
// Used when GAS_URL is empty or the API is unreachable.
// 12 realistic orders covering all three statuses.

const SAMPLE_ORDERS = [
  {
    OrderID: 'JR-20241024-9281',
    Timestamp: '2024-10-24T14:32:00.000Z',
    CustomerName: 'Zeeshan Ahmed',
    Phone: '03001234567',
    Address: 'DHA Phase 6, Khayaban-e-Seher, Karachi',
    Items: JSON.stringify([
      { name: 'Mutton Karahi', qty: 1, price: 2400, subtotal: 2400 },
      { name: 'Roghni Naan', qty: 4, price: 120, subtotal: 480 },
      { name: 'Mango Lassi', qty: 2, price: 280, subtotal: 560 },
    ]),
    Total: 3540,
    Notes: '',
    Status: 'Delivered'
  },
  {
    OrderID: 'JR-20241024-9280',
    Timestamp: '2024-10-24T13:55:00.000Z',
    CustomerName: 'Sana Mansoor',
    Phone: '03211234567',
    Address: 'PECHS Block 2, Tariq Road, Karachi',
    Items: JSON.stringify([
      { name: 'Chicken Biryani', qty: 2, price: 850, subtotal: 1700 },
      { name: 'Mint Margarita', qty: 2, price: 350, subtotal: 700 },
    ]),
    Total: 2500,
    Notes: 'Extra raita please',
    Status: 'Pending'
  },
  {
    OrderID: 'JR-20241024-9279',
    Timestamp: '2024-10-24T13:18:00.000Z',
    CustomerName: 'Fahad Raza',
    Phone: '03331234567',
    Address: 'Gulshan-e-Iqbal, Block 13D, Karachi',
    Items: JSON.stringify([
      { name: 'Mutton Karahi', qty: 2, price: 2400, subtotal: 4800 },
      { name: 'Garlic Naan', qty: 6, price: 150, subtotal: 900 },
      { name: 'Saffron Firni', qty: 2, price: 320, subtotal: 640 },
    ]),
    Total: 6440,
    Notes: 'Please ensure the kababs are extra spicy',
    Status: 'Delivered'
  },
  {
    OrderID: 'JR-20241024-9278',
    Timestamp: '2024-10-24T12:40:00.000Z',
    CustomerName: 'Kiran Ishaq',
    Phone: '03451234567',
    Address: 'Clifton Block 4, Marine Drive, Karachi',
    Items: JSON.stringify([
      { name: 'Seekh Kebab', qty: 2, price: 650, subtotal: 1300 },
      { name: 'Roghni Naan', qty: 2, price: 120, subtotal: 240 },
    ]),
    Total: 1640,
    Notes: '',
    Status: 'Delivered'
  },
  {
    OrderID: 'JR-20241024-9277',
    Timestamp: '2024-10-24T11:55:00.000Z',
    CustomerName: 'Ali Abbasi',
    Phone: '03111234567',
    Address: 'North Nazimabad, Block H, Karachi',
    Items: JSON.stringify([
      { name: 'Lamb Biryani', qty: 1, price: 1200, subtotal: 1200 },
      { name: 'Mango Lassi', qty: 1, price: 280, subtotal: 280 },
    ]),
    Total: 1580,
    Notes: 'Leave at the gate',
    Status: 'Cancelled'
  },
  {
    OrderID: 'JR-20241024-9276',
    Timestamp: '2024-10-24T11:20:00.000Z',
    CustomerName: 'Fatima Shah',
    Phone: '03451122334',
    Address: 'Bahria Town Phase 5, Rawalpindi',
    Items: JSON.stringify([
      { name: 'Peshawari Chapli Kebab', qty: 4, price: 200, subtotal: 800 },
      { name: 'Roghni Naan', qty: 4, price: 120, subtotal: 480 },
      { name: 'Mint Margarita', qty: 2, price: 350, subtotal: 700 },
    ]),
    Total: 2080,
    Notes: '',
    Status: 'Delivered'
  },
  {
    OrderID: 'JR-20241024-9275',
    Timestamp: '2024-10-24T10:45:00.000Z',
    CustomerName: 'Omar Farooq',
    Phone: '03211987654',
    Address: 'F-7/2, Islamabad',
    Items: JSON.stringify([
      { name: 'Chicken Karahi', qty: 1, price: 1600, subtotal: 1600 },
      { name: 'Garlic Naan', qty: 4, price: 150, subtotal: 600 },
    ]),
    Total: 2300,
    Notes: 'Medium spice please',
    Status: 'Pending'
  },
  {
    OrderID: 'JR-20241024-9274',
    Timestamp: '2024-10-24T10:02:00.000Z',
    CustomerName: 'Hamza Sheikh',
    Phone: '03001987654',
    Address: 'Model Town, Lahore',
    Items: JSON.stringify([
      { name: 'Lamb Biryani', qty: 2, price: 1200, subtotal: 2400 },
      { name: 'Shahi Tukray', qty: 2, price: 450, subtotal: 900 },
    ]),
    Total: 3400,
    Notes: 'Bowl packaging if possible',
    Status: 'Delivered'
  },
  {
    OrderID: 'JR-20241024-9273',
    Timestamp: '2024-10-24T09:30:00.000Z',
    CustomerName: 'Rukhsana Bibi',
    Phone: '03321234567',
    Address: 'Johar Town, Lahore',
    Items: JSON.stringify([
      { name: 'Chicken Biryani', qty: 3, price: 850, subtotal: 2550 },
      { name: 'Mango Lassi', qty: 3, price: 280, subtotal: 840 },
    ]),
    Total: 3490,
    Notes: '',
    Status: 'Cancelled'
  },
  {
    OrderID: 'JR-20241023-9260',
    Timestamp: '2024-10-23T20:15:00.000Z',
    CustomerName: 'Tariq Mehmood',
    Phone: '03041234567',
    Address: 'Gulberg III, Main Boulevard, Lahore',
    Items: JSON.stringify([
      { name: 'Mutton Karahi', qty: 1, price: 2400, subtotal: 2400 },
      { name: 'Seekh Kebab', qty: 2, price: 650, subtotal: 1300 },
      { name: 'Roghni Naan', qty: 6, price: 120, subtotal: 720 },
      { name: 'Saffron Firni', qty: 2, price: 320, subtotal: 640 },
    ]),
    Total: 5160,
    Notes: 'Family gathering — handle with care',
    Status: 'Delivered'
  },
  {
    OrderID: 'JR-20241023-9259',
    Timestamp: '2024-10-23T19:40:00.000Z',
    CustomerName: 'Nadia Qureshi',
    Phone: '03131234567',
    Address: 'Cantt Area, Rawalpindi',
    Items: JSON.stringify([
      { name: 'Peshawari Chapli Kebab', qty: 6, price: 200, subtotal: 1200 },
      { name: 'Garlic Naan', qty: 6, price: 150, subtotal: 900 },
      { name: 'Mint Margarita', qty: 4, price: 350, subtotal: 1400 },
    ]),
    Total: 3600,
    Notes: '',
    Status: 'Pending'
  },
  {
    OrderID: 'JR-20241023-9258',
    Timestamp: '2024-10-23T18:55:00.000Z',
    CustomerName: 'Bilal Chaudhry',
    Phone: '03001119988',
    Address: 'Wapda Town, Lahore',
    Items: JSON.stringify([
      { name: 'Chicken Karahi', qty: 1, price: 1600, subtotal: 1600 },
      { name: 'Lamb Biryani', qty: 1, price: 1200, subtotal: 1200 },
      { name: 'Shahi Tukray', qty: 3, price: 450, subtotal: 1350 },
    ]),
    Total: 4250,
    Notes: 'Ring the bell twice',
    Status: 'Delivered'
  }
];
