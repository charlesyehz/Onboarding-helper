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
    id: "individual",
    label: "Individual",
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
  {
    id: "unincorporated-association",
    label: "Unincorporated Association",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "61606290472",
      },
    ],
  },
  {
    id: "not-supported",
    label: "Not Supported",
    fields: [
      {
        role: "textbox",
        name: "ABN or ACN",
        value: "49982967267",
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

const auRegisteredAddress = [
  {
    id: "arnold-dvs-address",
    label: "Arnold DVStest",
    fields: [
      {
        role: "textbox",
        name: "Address",
        value: "190 Neerim Rd CARNEGIE VIC 3163",
      },
    ],
  },
  {
    id: "keli-cowey-address",
    label: "Keli COWEY",
    fields: [
      {
        role: "textbox",
        name: "Address",
        value: "100 ARTHUR STREET NORTH SYDNEY NSW 2060",
      },
    ],
  },
];

const auKycConfirm = [
  {
    id: "arnold-dvs-confirm",
    label: "Arnold DVStest",
    fields: [
      { role: "textbox", name: "fullName", value: "Arnold DVStest" },
      { role: "textbox", name: "firstName", value: "Arnold" },
      { role: "textbox", name: "lastName", value: "DVStest" },
      {
        role: "textbox",
        name: "Address",
        value: "190 Neerim Rd CARNEGIE VIC 3163",
      },
      { role: "textbox", name: "dob", value: "01/09/1988" },
      { role: "textbox", name: "documentNumber", value: "N1000091" },
    ],
  },
  {
    id: "keli-cowey-confirm",
    label: "Keli COWEY",
    fields: [
      { role: "textbox", name: "fullName", value: "Keli COWEY" },
      { role: "textbox", name: "First Name", value: "Keli" },
      { role: "textbox", name: "Last Name", value: "COWEY" },
      { role: "textbox", name: "dob", value: "25/03/1952" },
      { role: "textbox", name: "documentNumber", value: "N1000093" },
      {
        role: "textbox",
        name: "Address",
        value: "100 ARTHUR STREET NORTH SYDNEY NSW 2060",
      },
    ],
  },
];

const ukBusinessInfo = [
  {
    id: "uk-company",
    label: "Company",
    fields: [{ role: "textbox", name: "ABN or ACN", value: "01591116" }],
  },
  {
    id: "uk-partnership",
    label: "Partnership",
    fields: [{ role: "textbox", name: "ABN or ACN", value: "OC304073" }],
  },
  {
    id: "uk-trust",
    label: "Trust",
    fields: [{ role: "textbox", name: "ABN or ACN", value: "GE000124" }],
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

const ukRegisteredAddress = [
  {
    id: "olivia-west-address",
    label: "Olivia West",
    fields: [
      {
        role: "textbox",
        name: "Address",
        value: "42 High Street LONDON SW1A 1AA",
      },
    ],
  },
  {
    id: "jacob-hughes-address",
    label: "Jacob Hughes",
    fields: [
      {
        role: "textbox",
        name: "Address",
        value: "10 Castle Terrace EDINBURGH EH1 2DP",
      },
    ],
  },
];

const ukKycConfirm = [
  {
    id: "olivia-west-confirm",
    label: "Olivia West",
    fields: [
      { role: "textbox", name: "fullName", value: "Olivia West" },
      { role: "textbox", name: "dob", value: "12/03/1989" },
      { role: "textbox", name: "documentNumber", value: "512499843" },
    ],
  },
  {
    id: "jacob-hughes-confirm",
    label: "Jacob Hughes",
    fields: [
      { role: "textbox", name: "fullName", value: "Jacob Hughes" },
      { role: "textbox", name: "dob", value: "08/11/1984" },
      { role: "textbox", name: "documentNumber", value: "593822410" },
    ],
  },
];

const auAddMember = [
  {
    id: "arnold-dvs-member",
    label: "Arnold DVStest",
    fields: [
      { role: "textbox", name: "firstName", value: "Arnold" },
      { role: "textbox", name: "lastName", value: "DVStest" },
      { role: "textbox", name: "dob", value: "01/09/1988" },
      {
        role: "textbox",
        name: "companyName",
        value: "Arnold Advisory Pty Ltd",
      },
      { role: "textbox", name: "registrationNumber", value: "64123456789" },
    ],
  },
  {
    id: "keli-cowey-member",
    label: "Keli COWEY",
    fields: [
      { role: "textbox", name: "firstName", value: "Keli" },
      { role: "textbox", name: "middleName", value: "Anne" },
      { role: "textbox", name: "lastName", value: "COWEY" },
      { role: "textbox", name: "dob", value: "25/03/1952" },
      { role: "textbox", name: "companyName", value: "Cowey & Co Holdings" },
      { role: "textbox", name: "registrationNumber", value: "23670894512" },
    ],
  },
];

const ukAddMember = [
  {
    id: "olivia-west-member",
    label: "Olivia West",
    fields: [
      { role: "textbox", name: "firstName", value: "Olivia" },
      { role: "textbox", name: "middleName", value: "Rose" },
      { role: "textbox", name: "lastName", value: "West" },
      { role: "textbox", name: "dob", value: "12/03/1989" },
      { role: "textbox", name: "companyName", value: "West Consulting Ltd" },
      { role: "textbox", name: "registrationNumber", value: "OC304073" },
    ],
  },
  {
    id: "jacob-hughes-member",
    label: "Jacob Hughes",
    fields: [
      { role: "textbox", name: "firstName", value: "Jacob" },
      { role: "textbox", name: "middleName", value: "William" },
      { role: "textbox", name: "lastName", value: "Hughes" },
      { role: "textbox", name: "dob", value: "08/11/1984" },
      { role: "textbox", name: "companyName", value: "Hughes Trading LLP" },
      { role: "textbox", name: "registrationNumber", value: "GE000124" },
    ],
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
      "kyc-confirm-details": auKycConfirm,
      "registered-office-address": auRegisteredAddress,
      "add-member": auAddMember,
      "register-phone": [],
    },
    UK: {
      "business-info": ukBusinessInfo,
      "kyc-share-info": ukKycShare,
      "kyc-passport": ukPassport,
      "kyc-confirm-details": ukKycConfirm,
      "registered-office-address": ukRegisteredAddress,
      "add-member": ukAddMember,
      "register-phone": ukRegisterPhone,
    },
  },
};

export function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}
