// Brands for the v2 marquee: id (public/logos/brands/<id>.png, light versions rendered from each company's Wikipedia
// logo), display name, and the logo's width:height so every logo can be given roughly the same visual area.
export const BRANDS = [
  ['microsoft', 'Microsoft', 4.67], ['bofa', 'Bank of America', 2.36], ['ford', 'Ford', 2.77], ['pfizer', 'Pfizer', 2.33],
  ['expedia', 'Expedia', 4.96], ['wpp', 'WPP', 3.33], ['jpmc', 'JPMorgan Chase', 7.03], ['gm', 'General Motors', 3.74],
  ['stubhub', 'StubHub', 2.2], ['jnj', 'Johnson & Johnson', 10.67], ['capitalone', 'Capital One', 2.77], ['fanatics', 'Fanatics', 4.81],
  ['stellantis', 'Stellantis', 4.71], ['omnicom', 'Omnicom', 8.42], ['fidelity', 'Fidelity', 2.42], ['fitbit', 'Fitbit', 5.93],
  ['haleon', 'Haleon', 6.4], ['petsmart', 'PetSmart', 2.34], ['kia', 'Kia', 4.24], ['publicis', 'Publicis', 2.39],
  ['ibkr', 'Interactive Brokers', 6.88], ['chewy', 'Chewy', 2.33], ['enterprise', 'Enterprise', 4.85],
].map(([id, name, ratio]) => ({ id, name, ratio }));
