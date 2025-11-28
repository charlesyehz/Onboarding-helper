export const ROUTES = [
  {
    id: "business-info",
    path: "/onboarding/your-business-information",
    title: "Business Information",
    personas: [
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
    ],
  },
  {
    id: "kyc-share-info",
    path: "/onboarding/kyc/share-your-information",
    title: "KYC · Share Your Information",
    personas: [
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
    ],
  },
  {
    id: "kyc-passport",
    path: "/onboarding/kyc/passport",
    title: "KYC · Passport",
    personas: [
      {
        id: "arnold-dvs-passport",
        label: "Arnold DVStest",
        fields: [
          { role: "textbox", name: "Document number", value: "N1000091" },
        ],
      },
      {
        id: "keli-cowey-passport",
        label: "Keli COWEY",
        fields: [
          { role: "textbox", name: "Document number", value: "N1000093" },
        ],
      },
    ],
  },
  {
    id: "register-phone",
    path: "/register-phone",
    title: "Register Phone",
    personas: [],
  },
];
