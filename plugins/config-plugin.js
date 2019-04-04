const plugin = {
    install(Vue, config) {
        const newConfig = {};

        for (const key in config) {
            if (config.hasOwnProperty(key)) {
                const value = config[key];

                Object.defineProperty(
                    newConfig,
                    key,
                    {
                        get() {
                            return value;
                        },
                        configurable: false,
                        enumerable: true
                    }
                );
            }
        }

        Object.defineProperty(
            Vue.prototype,
            'config',
            {
                get() {
                    return newConfig;
                }
            }
        );
    }
};

export function setupPlugin(Vue, config) {
    Vue.use(plugin, config);
}