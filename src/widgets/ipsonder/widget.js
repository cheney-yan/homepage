import genericProxyHandler from "utils/proxy/handlers/generic";

const widget = {
  api: "{url}",
  proxyHandler: genericProxyHandler,

  mappings: {
    root: {
      endpoint: "/",
    },
  },
};

export default widget;
