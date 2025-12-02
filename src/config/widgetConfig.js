/**
 * Widget Configuration
 * Defines which routes have inline widgets and their behavior
 *
 * Widget types:
 * - 'email': Email generation (simple button)
 * - 'phone': Phone prefill (simple button)
 * - 'persona-select': Persona selection dropdown
 */

export const WIDGET_ROUTES = {
  // Email route (existing)
  signup: {
    urlPattern: /signup/i,
    fields: [
      {
        selectors: [
          "#signup-email-input",
          'input[id="email"]',
          'input[name="email"]',
          'input[type="email"]',
        ],
        widgetType: "email",
        buttonLabel: "Prefill email",
        hintText: "Uses your saved prefix + ticket.",
      },
    ],
  },

  // Business Information route (new)
  "business-info": {
    urlPattern: /\/onboarding\/your-business-information/i,
    fields: [
      {
        selectors: ["#abnOrAcn"],
        widgetType: "persona-select",
        personaRoute: "business-info",
        tooltipLabel: "Select Entity Type:",
        buttonLabel: "Prefill ABN",
      },
    ],
  },

  // Phone registration route (new)
  "register-phone": {
    urlPattern: /\/register-phone/i,
    fields: [
      {
        selectors: ["#phone"],
        widgetType: "phone",
        buttonLabel: "Prefill Phone",
        hintText: "Uses saved phone number",
      },
    ],
  },

  // KYC confirm details route
  "kyc-confirm-details": {
    urlPattern: /\/onboarding\/kyc\/confirm-your-details/i,
    fields: [
      {
        selectors: ["#fullName", 'input[name="fullName"]'],
        widgetType: "persona-select",
        personaRoute: "kyc-confirm-details",
        tooltipLabel: "Select Persona:",
        buttonLabel: "Prefill Details",
        multiField: true,
        prefillActions: [
          {
            id: "kyc-confirm-open-name-modal",
            type: "click",
            selectors: ["#fullName", 'input[name="fullName"]'],
            fields: [
              "firstName",
              "First Name",
              "middleName",
              "Middle Name",
              "lastName",
              "Last Name",
            ],
            waitForMs: 300,
          },
          {
            id: "kyc-confirm-open-address-modal",
            type: "click",
            textMatch: "enter address manually",
            textSelector: 'button, [role="button"]',
            fields: ["Address", "street", "Street"],
            waitForMs: 300,
          },
        ],
      },
    ],
  },

  // Registered office address route
  "registered-office-address": {
    urlPattern: /\/registered-office-address/i,
    fields: [
      {
        selectors: [
          "#registeredAddress\\.street1",
          'input[name="registeredAddress.street1"]',
          "#businessAddress\\.street1",
          'input[name="businessAddress.street1"]',
        ],
        widgetType: "persona-select",
        personaRoute: "registered-office-address",
        tooltipLabel: "Select Address:",
        buttonLabel: "Prefill Address",
      },
    ],
  },

  // Add member route
  "add-member": {
    urlPattern: /\/add-member/i,
    fields: [
      {
        selectors: [
          "#firstName",
          'input[name="firstName"]',
          "#companyName",
          'input[name="companyName"]',
          'input[name="member.firstName"]',
          'input[name="member.companyName"]',
        ],
        widgetType: "persona-select",
        personaRoute: "add-member",
        tooltipLabel: "Select Member:",
        buttonLabel: "Prefill All Fields",
        multiField: true, // This persona fills multiple fields
        fieldSearchAttempts: 1, // Skip retries so we don't wait on missing fields
      },
      {
        selectors: [
          "#street",
          "#street1",
          'input[name="street"]',
          'input[name="street1"]',
          'input[name="address.street"]',
          'input[name="address.street1"]',
          'input[name="member.address.street"]',
          'input[name="member.address.street1"]',
        ],
        widgetType: "persona-select",
        personaRoute: "registered-office-address",
        tooltipLabel: "Select Address:",
        buttonLabel: "Prefill Street",
      },
    ],
  },

  // Edit member route (shares personas with add-member)
  "edit-member": {
    urlPattern: /\/edit-member/i,
    fields: [
      {
        selectors: [
          "#firstName",
          'input[name="firstName"]',
          "#companyName",
          'input[name="companyName"]',
          'input[name="member.firstName"]',
          'input[name="member.companyName"]',
        ],
        widgetType: "persona-select",
        personaRoute: "add-member", // Share same personas as add-member
        tooltipLabel: "Select Member:",
        buttonLabel: "Prefill All Fields",
        multiField: true,
        fieldSearchAttempts: 1,
      },
      {
        selectors: [
          "#street",
          "#street1",
          'input[name="street"]',
          'input[name="street1"]',
          'input[name="address.street"]',
          'input[name="address.street1"]',
          'input[name="member.address.street"]',
          'input[name="member.address.street1"]',
        ],
        widgetType: "persona-select",
        personaRoute: "registered-office-address",
        tooltipLabel: "Select Address:",
        buttonLabel: "Prefill Street",
      },
    ],
  },
};

/**
 * Detect which route the current page matches
 * @param {string} pathname - URL pathname
 * @returns {string|null} - Route ID or null
 */
export function detectRoute(pathname) {
  for (const [routeId, config] of Object.entries(WIDGET_ROUTES)) {
    if (config.urlPattern.test(pathname)) {
      return routeId;
    }
  }
  return null;
}

/**
 * Get configuration for a specific route
 * @param {string} routeId - Route ID
 * @returns {object|null} - Route configuration or null
 */
export function getRouteConfig(routeId) {
  return WIDGET_ROUTES[routeId] || null;
}
