declare var __meteor_runtime_config__: any;
export const environment = {
    production: true,
    analyticsSettings: {
        'Google Analytics': {
            'trackingId': 'UA-123'
        }
    },
    'recaptcha': {
        'sitekey': ''
      },
    meteor: __meteor_runtime_config__
};
