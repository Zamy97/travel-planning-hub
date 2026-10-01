export interface AirbnbKitItem {
  id: string;
  title: string;
  detail: string;
}

/** Shared across every trip. Airbnbs usually miss these. */
export const AIRBNB_KIT: AirbnbKitItem[] = [
  {
    id: 'bodna',
    title: 'Bodna',
    detail: 'Bathroom water jug. Hosts almost never have one.',
  },
  {
    id: 'flip-flops',
    title: 'Indoor flip flops',
    detail: 'For the shower and the kitchen floor.',
  },
  {
    id: 'frying-pan',
    title: 'Small frying pan',
    detail: 'Many listings have one dull pan, or none you want to cook in.',
  },
  {
    id: 'condiments',
    title: 'Condiments',
    detail: 'Sauce packets, salt, chili, oil or mayo packets, tea bags. Assume the kitchen is bare.',
  },
  {
    id: 'plates',
    title: 'Plates, forks, and spoons',
    detail: 'Bring a small set. Cutlery is often short a few pieces, or plastic only.',
  },
  {
    id: 'cups',
    title: 'Cups',
    detail: 'Two real cups if you drink tea or need wudu.',
  },
  {
    id: 'knife-soap',
    title: 'Sharp knife, sponge, and dish soap',
    detail: 'Host knives are usually dull, and the soap runs out.',
  },
  {
    id: 'bags',
    title: 'Trash bags and zip bags',
    detail: 'Leftovers, and a quick kitchen reset on the way out.',
  },
  {
    id: 'towels',
    title: 'Paper towels or napkins',
    detail: 'Listings often leave a single roll, or none.',
  },
  {
    id: 'prayer-mat',
    title: 'Prayer mat',
    detail: 'Plus a spare if more than one person is praying.',
  },
  {
    id: 'chargers',
    title: 'Chargers and a short power strip',
    detail: 'Outlets are rarely next to the bed.',
  },
  {
    id: 'toiletries',
    title: 'Meds and the toiletries you actually use',
    detail: 'Pain relief, prescriptions, toothbrush, soap.',
  },
];
