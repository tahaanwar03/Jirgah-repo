const MENU = [
  // ===================== BAR B Q =====================
  { id: 'bbq-1', category: 'Bar B Q', name: 'Tikka Chest', price: 380, image: 'https://images.unsplash.com/photo-1632778149975-420e0e75ee08?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-2', category: 'Bar B Q', name: 'Tikka Leg', price: 350, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-3', category: 'Bar B Q', name: 'Tikka Malai Chest', price: 400, image: 'https://images.unsplash.com/photo-1626777559315-b0d73f79d009?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-4', category: 'Bar B Q', name: 'Chicken Boti Plate', price: 400, image: 'https://images.unsplash.com/photo-1626777559315-b0d73f79d009?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-5', category: 'Bar B Q', name: 'Chicken Boti Single', price: 200, image: 'https://images.unsplash.com/photo-1626777559315-b0d73f79d009?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-6', category: 'Bar B Q', name: 'Beef Boti Plate', price: 400, image: 'https://images.unsplash.com/photo-1544025162-831af776af5f?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-7', category: 'Bar B Q', name: 'Beef Boti Single', price: 200, image: 'https://images.unsplash.com/photo-1544025162-831af776af5f?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-8', category: 'Bar B Q', name: 'Malai Boti Plate', price: 400, image: 'https://images.unsplash.com/photo-1626777559315-b0d73f79d009?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-9', category: 'Bar B Q', name: 'Malai Boti Single', price: 200, image: 'https://images.unsplash.com/photo-1626777559315-b0d73f79d009?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-10', category: 'Bar B Q', name: 'Seekh Kabab Plate', price: 400, image: 'https://images.unsplash.com/photo-1606491956391-70868b5d0f47?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-11', category: 'Bar B Q', name: 'Seekh Kabab Single', price: 200, image: 'https://images.unsplash.com/photo-1606491956391-70868b5d0f47?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-12', category: 'Bar B Q', name: 'Gola Kabab Plate', price: 390, image: 'https://images.unsplash.com/photo-1606491956391-70868b5d0f47?auto=format&fit=crop&q=80&w=800' },
  { id: 'bbq-13', category: 'Bar B Q', name: 'Reshmi Kabab Plate', price: 370, image: 'https://images.unsplash.com/photo-1606491956391-70868b5d0f47?auto=format&fit=crop&q=80&w=800' },

  // ===================== ROLLS =====================
  { id: 'roll-1', category: 'Rolls', name: 'Chicken Roll', price: 190, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-2', category: 'Rolls', name: 'Chicken Mayo Roll', price: 200, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-3', category: 'Rolls', name: 'Chicken Cheese Roll', price: 230, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-4', category: 'Rolls', name: 'Chicken Malai Boti Roll', price: 200, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-5', category: 'Rolls', name: 'Beef Roll', price: 190, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-6', category: 'Rolls', name: 'Beef Mayo Roll', price: 200, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-7', category: 'Rolls', name: 'Beef Cheese Roll', price: 230, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-8', category: 'Rolls', name: 'Seekh Kabab Roll', price: 190, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-9', category: 'Rolls', name: 'Seekh Kabab Mayo Roll', price: 200, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-10', category: 'Rolls', name: 'Seekh Kabab Cheese Roll', price: 230, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-11', category: 'Rolls', name: 'Malai Boti Cheese Roll', price: 230, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-12', category: 'Rolls', name: 'Crispy Zinger Roll', price: 180, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-13', category: 'Rolls', name: 'Crispy Zinger Cheese Roll', price: 230, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-14', category: 'Rolls', name: 'Crispy Zinger Spicy Roll', price: 180, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-15', category: 'Rolls', name: 'Crispy Mayo Garlic Roll', price: 200, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-16', category: 'Rolls', name: 'Jirgah Jumbo Roll', price: 380, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-17', category: 'Rolls', name: 'Jirgah Special Roll', price: 220, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },
  { id: 'roll-18', category: 'Rolls', name: 'Jalapeno Roll with Cheese', price: 250, image: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=800' },

  // ===================== EXTRAS =====================
  { id: 'ext-1', category: 'Extras', name: 'Chapati', price: 20, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800' },
  { id: 'ext-2', category: 'Extras', name: 'Paratha', price: 40, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=800' },
  { id: 'ext-3', category: 'Extras', name: 'Raita', price: 30, image: 'https://images.unsplash.com/photo-1627366424368-466d7adbc3b4?auto=format&fit=crop&q=80&w=800' },
  { id: 'ext-4', category: 'Extras', name: 'Sauce', price: 40, image: 'https://images.unsplash.com/photo-1627366424368-466d7adbc3b4?auto=format&fit=crop&q=80&w=800' },
  { id: 'ext-5', category: 'Extras', name: 'Cheese Sauce', price: 80, image: 'https://images.unsplash.com/photo-1627366424368-466d7adbc3b4?auto=format&fit=crop&q=80&w=800' },

  // ===================== BROASTS =====================
  { id: 'br-1', category: 'Broasts', name: 'Crispy Chicken Broast (Chest)', price: 400, image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800' },
  { id: 'br-2', category: 'Broasts', name: 'Crispy Chicken Broast (Leg)', price: 380, image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800' },
  { id: 'br-3', category: 'Broasts', name: 'Cheesy Broast', price: 450, image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&q=80&w=800' },

  // ===================== SANDWICHES =====================
  { id: 'sw-1', category: 'Sandwiches', name: 'Mexican Sandwich', price: 450, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=800' },
  { id: 'sw-2', category: 'Sandwiches', name: 'Crispy Club Sandwich', price: 340, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=800' },
  { id: 'sw-3', category: 'Sandwiches', name: 'Club Sandwich', price: 340, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=800' },
  { id: 'sw-4', category: 'Sandwiches', name: 'Club with Cheese', price: 380, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&q=80&w=800' },

  // ===================== BURGERS =====================
  { id: 'bg-1', category: 'Burgers', name: 'Zinger Burger', price: 340, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-2', category: 'Burgers', name: 'Zinger with Cheese', price: 370, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-3', category: 'Burgers', name: 'Chicken Jalapeno Burger', price: 350, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-4', category: 'Burgers', name: 'Chicken Jalapeno Burger with Cheese', price: 380, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-5', category: 'Burgers', name: 'Chicken Burger', price: 250, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-6', category: 'Burgers', name: 'Chicken Burger with Cheese', price: 280, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-7', category: 'Burgers', name: 'Beef Burger', price: 280, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-8', category: 'Burgers', name: 'Beef Burger with Cheese', price: 310, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800' },
  { id: 'bg-9', category: 'Burgers', name: 'Beef Jalapeno Burger', price: 350, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&q=80&w=800' },

  // ===================== PARATHAS =====================
  { id: 'pr-1', category: 'Parathas', name: 'Alu Paratha', price: 180, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
  { id: 'pr-2', category: 'Parathas', name: 'Pizza Paratha', price: 280, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
  { id: 'pr-3', category: 'Parathas', name: 'Chicken Cheese Paratha', price: 280, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
  { id: 'pr-4', category: 'Parathas', name: 'BBQ Paratha', price: 280, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
  { id: 'pr-5', category: 'Parathas', name: 'Qeema Cheese Paratha', price: 300, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
  { id: 'pr-6', category: 'Parathas', name: 'Malai Boti Paratha', price: 300, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },
  { id: 'pr-7', category: 'Parathas', name: 'Alu Cheese Paratha', price: 230, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&q=80&w=800' },

  // ===================== FLAVOURED FRIES (S/M/L) =====================
  ...['Masala Fries', 'Plain Fries', 'BBQ Fries', 'Cheese Flavored Fries', 'Blackpepper Fries', 'Lemon Achar Fries', 'Chicken Masala Fries', 'Green Chilli Fries', 'Jalapeno Fries', 'Hot & Sweet Fries'].map((name, idx) => ({
    id: `ff-${idx+1}`,
    category: 'Flavoured Fries',
    name: name,
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800',
    variants: [
      { size: 'Small', price: 100 },
      { size: 'Medium', price: 150 },
      { size: 'Large', price: 200 }
    ]
  })),

  // ===================== SPECIAL MAYONATIC FRIES =====================
  { id: 'smf-1', category: 'Special Mayonatic Fries', name: 'Pizza Fries', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 270 }, { size: 'Medium', price: 400 }] },
  { id: 'smf-2', category: 'Special Mayonatic Fries', name: 'Pizza Fries Loaded', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 320 }, { size: 'Medium', price: 450 }] },
  { id: 'smf-3', category: 'Special Mayonatic Fries', name: 'Chipotle Fries', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 270 }, { size: 'Medium', price: 400 }] },
  { id: 'smf-4', category: 'Special Mayonatic Fries', name: 'Chipotle Fries Loaded', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 320 }, { size: 'Medium', price: 450 }] },
  { id: 'smf-5', category: 'Special Mayonatic Fries', name: 'Honey Mustard Fries (New)', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 450 }] },
  { id: 'smf-6', category: 'Special Mayonatic Fries', name: 'Chicken Malai Botti Fries (New)', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 450 }] },
  { id: 'smf-7', category: 'Special Mayonatic Fries', name: 'Chicken BBQ Tikka Fries (New)', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 450 }] },
  { id: 'smf-8', category: 'Special Mayonatic Fries', name: 'Beef Jalapeno Cheese Fries (New)', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 450 }] },
  { id: 'smf-9', category: 'Special Mayonatic Fries', name: 'Jirgah Special Fries', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 320 }, { size: 'Medium', price: 450 }] },
  { id: 'smf-10', category: 'Special Mayonatic Fries', name: 'Cheese Fries', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Small', price: 270 }, { size: 'Medium', price: 400 }] },
  { id: 'smf-11', category: 'Special Mayonatic Fries', name: 'Matka Fries', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&q=80&w=800', variants: [{ size: 'Medium', price: 420 }] },

  // ===================== PIZZA SPECIAL FLAVORS =====================
  {
    id: 'piz-sp-1', category: 'Pizza Special Flavors', name: 'Jirgah Special', description: 'Onion, Capsicum, Cheese, Olive & Special White Sauce',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Medium', price: 600 }, { size: 'Large', price: 1000 }]
  },
  {
    id: 'piz-sp-2', category: 'Pizza Special Flavors', name: 'Kebab Crust', description: 'Edges filled with kebab and Topping of special Chicken, mushroom, cheese, olive & onion',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Medium', price: 600 }, { size: 'Large', price: 1000 }]
  },
  {
    id: 'piz-sp-3', category: 'Pizza Special Flavors', name: 'Crown Crust', description: 'Yummy grilled chicken, onion, cheese, capsicum & olive',
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Medium', price: 600 }, { size: 'Large', price: 1000 }]
  },
  {
    id: 'piz-sp-4', category: 'Pizza Special Flavors', name: 'Behari Kebab', description: 'Special chicken with Behari kebab flavor, cheese, onion, capsicum & olive',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Medium', price: 600 }, { size: 'Large', price: 1000 }]
  },
  {
    id: 'piz-sp-5', category: 'Pizza Special Flavors', name: 'Cheese Crust', description: 'Edges filled with cheese, chicken, onion, olives & capsicum',
    image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Medium', price: 600 }, { size: 'Large', price: 1000 }]
  },

  // ===================== PIZZA TRADITIONAL FLAVORS =====================
  {
    id: 'piz-tr-1', category: 'Pizza Traditional Flavors', name: 'Chicken Tikka', description: 'Traditional Chicken with onions and olives',
    image: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 500 }, { size: 'Large', price: 750 }]
  },
  {
    id: 'piz-tr-2', category: 'Pizza Traditional Flavors', name: 'Chicken Fajita', description: 'Authentic taste with fajita chunks, onions & olives',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 500 }, { size: 'Large', price: 750 }]
  },
  {
    id: 'piz-tr-3', category: 'Pizza Traditional Flavors', name: 'Creamy Cheesy Chicken', description: 'Combination of fajita, Tikka, Onion & Jalapeno',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 500 }, { size: 'Large', price: 750 }]
  },
  {
    id: 'piz-tr-4', category: 'Pizza Traditional Flavors', name: 'Veggie Lover', description: 'Combination of raw veggies, onion, capsicum, jalapenos, cheese & olives',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 500 }, { size: 'Large', price: 750 }]
  },
  {
    id: 'piz-tr-5', category: 'Pizza Traditional Flavors', name: 'Chicken Malai Boti', description: 'Special Malai boti chicken with onion & capsicum',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 500 }, { size: 'Large', price: 750 }]
  },
  {
    id: 'piz-tr-6', category: 'Pizza Traditional Flavors', name: 'Chicken Afghani Feast', description: 'Special Afghani chicken with onion & Jalapeno',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 500 }, { size: 'Large', price: 750 }]
  },
  {
    id: 'piz-tr-7', category: 'Pizza Traditional Flavors', name: 'Italian Spicy', description: 'Traditional Chicken with onions and olives',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 300 }, { size: 'Medium', price: 500 }, { size: 'Large', price: 750 }]
  },

  // ===================== OVEN BAKED PASTA =====================
  {
    id: 'pas-1', category: 'Oven Baked Pasta', name: 'Crunchy Pasta', description: 'Yummy pasta baked with mayo sauce, fajita chicken, capsicum & cheese',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 350 }, { size: 'Medium', price: 500 }]
  },
  {
    id: 'pas-2', category: 'Oven Baked Pasta', name: 'Special Pasta', description: '2 special flavours with chicken, corn, cheese, capsicum, mushrooms & olives',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&q=80&w=800',
    variants: [{ size: 'Small', price: 400 }, { size: 'Medium', price: 600 }]
  },
  // Note: the menu has Mexican Sandwich 450 Rs down here, but it's already in Sandwiches section. We'll skip duplicating it or we can add it as a standalone. We will skip it as it's a dupe.
];
