export const ROUTES = [
  {
    id: "business-info",
    path: "/onboarding/your-business-information",
    title: "Business Information Personas",
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
    title: "KYC Share Your Info (Legacy)",
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
    title: "KYC. Passport (Legacy)",
    fieldSchema: [
      {
        role: "textbox",
        name: "Document number",
        placeholder: "Passport number",
      },
    ],
  },
  {
    id: "kyc-confirm-details",
    path: "/onboarding/kyc/confirm-your-details",
    title: "KYC Confirm Your Details",
    fieldSchema: [
      {
        role: "textbox",
        name: "fullName",
        placeholder: "Full name",
      },
      {
        role: "textbox",
        name: "firstName",
        placeholder: "First name",
      },
      {
        role: "textbox",
        name: "middleName",
        placeholder: "Middle name",
      },
      {
        role: "textbox",
        name: "lastName",
        placeholder: "Last name",
      },
      { role: "textbox", name: "dob", placeholder: "DD/MM/YYYY" },
      {
        role: "textbox",
        name: "documentNumber",
        placeholder: "Passport number",
      },
      {
        role: "textbox",
        name: "Address",
        placeholder: "Street, suburb, state",
      },
    ],
  },
  {
    id: "registered-office-address",
    path: "/onboarding/*/registered-office-address",
    altPaths: ["/registered-office-address"],
    title: "Registered Office Address",
    fieldSchema: [
      {
        role: "textbox",
        name: "Address",
        placeholder: "Street, suburb, state",
      },
    ],
  },
  {
    id: "register-phone",
    path: "/register-phone",
    title: "Register Phone",
    fieldSchema: [],
  },
  {
    id: "add-member",
    path: "/onboarding/*/add-member",
    title: "Members",
    fieldSchema: [
      { role: "textbox", name: "firstName", placeholder: "First name" },
      { role: "textbox", name: "middleName", placeholder: "Middle name" },
      { role: "textbox", name: "lastName", placeholder: "Last name" },
      { role: "textbox", name: "dob", placeholder: "DD/MM/YYYY" },
      { role: "textbox", name: "street", placeholder: "Street address" },
      { role: "textbox", name: "companyName", placeholder: "Company name" },
      {
        role: "textbox",
        name: "registrationNumber",
        placeholder: "Company registration number",
      },
    ],
  },
];
