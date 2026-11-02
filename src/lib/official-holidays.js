// BIT Mesra's official holidays, from the Registrar's Notice 26 of 22 Dec 2025
// (01 Jan 2026 to 31 Dec 2026). Shown to every student on the calendar, on top
// of the holidays each student marks for themselves. Add next year's list here.
const NOTICE = [
  ['New Year\'s Day', ['2026-01-01']],
  ['Sohrai', ['2026-01-12', '2026-01-13']],
  ['Makar Sankranti', ['2026-01-14']],
  ['Basant Panchami', ['2026-01-23']],
  ['Republic Day', ['2026-01-26']],
  ['Maha Shivaratri', ['2026-02-15']],
  ['Holi', ['2026-03-03', '2026-03-04']],
  ['Eid-ul-Fitr / Sarhul', ['2026-03-21', '2026-03-22']],
  ['Rama Navami', ['2026-03-26']],
  ['Mahavir Jayanti', ['2026-03-31']],
  ['Good Friday', ['2026-04-03']],
  ['Dr. B. R. Ambedkar Jayanti', ['2026-04-14']],
  ['Buddha Purnima', ['2026-05-01']],
  ['Eid-ul-Zoha', ['2026-05-27']],
  ['Muharram', ['2026-06-26']],
  ['Rath Yatra', ['2026-07-16']],
  ['Independence Day', ['2026-08-15']],
  ['Eid-e-Milad-un-Nabi', ['2026-08-26']],
  ['Raksha Bandhan', ['2026-08-28']],
  ['Janmasthami', ['2026-09-04']],
  ['Vishwakarma Puja', ['2026-09-17']],
  ['Karma', ['2026-09-22', '2026-09-23']],
  ['Gandhi Jayanti', ['2026-10-02']],
  ['Durga Puja', ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']],
  ['Deepawali', ['2026-11-08']],
  ['Goverdhan Puja', ['2026-11-09']],
  ['Bhaiduj - Chitragupta Puja', ['2026-11-11']],
  ['Chhath Puja / Birsa Jayanti', ['2026-11-15', '2026-11-16']],
  ['Guru Nanak Jayanti', ['2026-11-24']],
  ['Christmas', ['2026-12-25']],
];

// date (YYYY-MM-DD) -> holiday name
export const OFFICIAL_HOLIDAYS = Object.fromEntries(
  NOTICE.flatMap(([name, dates]) => dates.map((date) => [date, name])),
);
