export const ROUTES = [
  {
    id: "business-info",
    path: "/onboarding/your-business-information",
    title: "Business Information",
    fieldSchema: [
      {
        role: "textbox",
        name: "ABN or ACN",
        placeholder: "Enter ABN/ACN",
      },
    ],
  },
  {
    id: "kyc-share-info",
    path: "/onboarding/kyc/share-your-information",
    title: "KYC · Share Your Information",
    fieldSchema: [
      { role: "textbox", name: "First Name", placeholder: "First name" },
      { role: "textbox", name: "Last Name", placeholder: "Last name" },
      { role: "textbox", name: "Date of birth", placeholder: "DD/MM/YYYY" },
      {
        role: "textbox",
        name: "Address",
        placeholder: "Street, suburb, state",
      },
    ],
  },
  {
    id: "kyc-passport",
    path: "/onboarding/kyc/passport",
    title: "KYC · Passport",
    fieldSchema: [
      {
        role: "textbox",
        name: "Document number",
        placeholder: "Passport number",
      },
    ],
  },
  {
    id: "register-phone",
    path: "/register-phone",
    title: "Register Phone",
    fieldSchema: [],
  },
];
