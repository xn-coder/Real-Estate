
export const activeLeads = [
  { id: 'lead1', name: 'John Smith', email: 'john.smith@example.com', phone: '123-456-7890', status: 'New' },
  { id: 'lead2', name: 'Jane Doe', email: 'jane.doe@example.com', phone: '234-567-8901', status: 'Contacted' },
  { id: 'lead3', name: 'Peter Jones', email: 'peter.jones@example.com', phone: '345-678-9012', status: 'Qualified' },
  { id: 'lead4', name: 'Mary Johnson', email: 'mary.johnson@example.com', phone: '456-789-0123', status: 'New' },
  { id: 'lead5', name: 'David Williams', email: 'david.williams@example.com', phone: '567-890-1234', status: 'Lost' },
];

export const activeListings = [
  { id: 'list1', address: '123 Sunny Lane', price: 500000, bedrooms: 3, bathrooms: 2, status: 'For Sale', image: 'https://placehold.co/400x400.png' },
  { id: 'list2', address: '456 Ocean View', price: 1200000, bedrooms: 4, bathrooms: 3, status: 'For Sale', image: 'https://placehold.co/400x400.png' },
  { id: 'list3', address: '789 Pine Forest', price: 750000, bedrooms: 4, bathrooms: 2.5, status: 'Under Contract', image: 'https://placehold.co/400x400.png' },
  { id: 'list4', address: '101 Maple Street', price: 350000, bedrooms: 2, bathrooms: 1, status: 'Sold', image: 'https://placehold.co/400x400.png' },
];

export const activeDeals = [
  { id: 'deal1', client: 'The Millers', property: '123 Sunny Lane', value: 495000, stage: 'Under Contract', closingDate: '2024-08-15' },
  { id: 'deal2', client: 'Sarah Connor', property: '789 Pine Forest', value: 750000, stage: 'Closing', closingDate: '2024-07-30' },
  { id: 'deal3', client: 'John Wick', property: '456 Ocean View', value: 1180000, stage: 'Offer Made', closingDate: '2024-09-01' },
  { id: 'deal4', client: 'Emily Blunt', property: '221B Baker St', value: 900000, stage: 'Viewing', closingDate: '2024-09-20' },
  { id: 'deal5', client: 'Tom Hardy', property: '10 Downing St', value: 2500000, stage: 'Inquiry', closingDate: '2024-10-05' },
];

type DealsByStage = {
  [key: string]: typeof activeDeals;
};

export const dealsByStage: DealsByStage = activeDeals.reduce((acc: DealsByStage, deal) => {
  if (!acc[deal.stage]) {
    acc[deal.stage] = [];
  }
  acc[deal.stage].push(deal);
  return acc;
}, {});

export const appointments = [
  { id: 'appt1', client: 'The Millers', property: '123 Sunny Lane', date: new Date().toISOString(), time: '10:00 AM', type: 'Final Walkthrough' },
  { id: 'appt2', client: 'Emily Blunt', property: '221B Baker St', date: new Date().toISOString(), time: '02:00 PM', type: 'Showing' },
  { id: 'appt3', client: 'New Inquiry', property: 'N/A', date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), time: '11:30 AM', type: 'Client Call' },
  { id: 'appt4', client: 'John Wick', property: '456 Ocean View', date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), time: '03:00 PM', type: 'Inspection' },
];

export const chartData = [
  { month: "Jan", leads: 12 },
  { month: "Feb", leads: 19 },
  { month: "Mar", leads: 15 },
  { month: "Apr", leads: 22 },
  { month: "May", leads: 18 },
  { month: "Jun", leads: 25 },
];

export const marketingKits = [
  { id: 'kit1', type: 'Poster', title: 'Luxury Villa Showcase', featureImage: 'https://placehold.co/600x400.png', files: ['villa_poster.pdf', 'villa_images.zip'] },
  { id: 'kit2', type: 'Brochure', title: 'Downtown Condo Brochure', featureImage: 'https://placehold.co/600x400.png', files: ['condo_brochure.pdf'] },
  { id: 'kit3', type: 'Poster', title: 'Open House: Sunny Lane', featureImage: 'https://placehold.co/600x400.png', files: ['open_house_poster.png'] },
];
