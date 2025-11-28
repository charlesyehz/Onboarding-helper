export const SETTINGS_VERSION = 1;

const auBusinessInfo = [
  {
    id: "company",
    label: "Company",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "26 004 139 397",
      },
    ],
  },
  {
    id: "sole-trader",
    label: "Sole Trader",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "54461284958",
      },
    ],
  },
  {
    id: "partnership",
    label: "Partnership",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "63 934 742 489",
      },
    ],
  },
  {
    id: "trust",
    label: "Trust",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "21399798224",
      },
    ],
  },
  {
    id: "government",
    label: "Government",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "72413638997",
      },
    ],
  },
  {
    id: "association",
    label: "Association",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "27577258008",
      },
    ],
  },
];

const auKycShare = [
  {
    id: "arnold-dvs",
    label: "Arnold DVStest",
    fields: [
      { role: "textbox", name: "First Name", value: "Arnold" },
      { role: "textbox", name: "Last Name", value: "DVStest" },
      { role: "textbox", name: "Date of birth", value: "01/09/1988" },
      {
        role: "textbox",
        name: "Address",
        value: "190 Neerim Rd CARNEGIE VIC 3163",
      },
    ],
  },
  {
    id: "keli-cowey",
    label: "Keli COWEY",
    fields: [
      { role: "textbox", name: "First Name", value: "Keli" },
      { role: "textbox", name: "Last Name", value: "COWEY" },
      { role: "textbox", name: "Date of birth", value: "25/03/1952" },
      {
        role: "textbox",
        name: "Address",
        value: "100 ARTHUR STREET NORTH SYDNEY NSW 2060",
      },
    ],
  },
];

const auPassport = [
  {
    id: "arnold-dvs-passport",
    label: "Arnold DVStest",
    fields: [{ role: "textbox", name: "Document number", value: "N1000091" }],
  },
  {
    id: "keli-cowey-passport",
    label: "Keli COWEY",
    fields: [{ role: "textbox", name: "Document number", value: "N1000093" }],
  },
];

const ukBusinessInfo = [
  {
    id: "uk-limited",
    label: "UK Limited Company",
    fields: [
      { role: "textbox", name: "Company number", value: "08268716" },
    ],
  },
  {
    id: "uk-sole-trader",
    label: "UK Sole Trader",
    fields: [
      { role: "textbox", name: "Company number", value: "NI038482" },
    ],
  },
];

const ukKycShare = [
  {
    id: "olivia-west",
    label: "Olivia West",
    fields: [
      { role: "textbox", name: "First Name", value: "Olivia" },
      { role: "textbox", name: "Last Name", value: "West" },
      { role: "textbox", name: "Date of birth", value: "12/03/1989" },
      {
        role: "textbox",
        name: "Address",
        value: "42 High Street LONDON SW1A 1AA",
      },
    ],
  },
  {
    id: "jacob-hughes",
    label: "Jacob Hughes",
    fields: [
      { role: "textbox", name: "First Name", value: "Jacob" },
      { role: "textbox", name: "Last Name", value: "Hughes" },
      { role: "textbox", name: "Date of birth", value: "08/11/1984" },
      {
        role: "textbox",
        name: "Address",
        value: "10 Castle Terrace EDINBURGH EH1 2DP",
      },
    ],
  },
];

const ukPassport = [
  {
    id: "olivia-west-passport",
    label: "Olivia West",
    fields: [{ role: "textbox", name: "Document number", value: "512499843" }],
  },
  {
    id: "jacob-hughes-passport",
    label: "Jacob Hughes",
    fields: [{ role: "textbox", name: "Document number", value: "593822410" }],
  },
];

const ukRegisterPhone = [];

export const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  inlineWidgetEnabled: true,
  personas: {
    AU: {
      "business-info": auBusinessInfo,
      "kyc-share-info": auKycShare,
      "kyc-passport": auPassport,
      "register-phone": [],
    },
    UK: {
      "business-info": ukBusinessInfo,
      "kyc-share-info": ukKycShare,
      "kyc-passport": ukPassport,
      "register-phone": ukRegisterPhone,
    },
  },
};

export function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}
