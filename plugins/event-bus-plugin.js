import generateUniqueId from '@mehyaa/javascript-common/utility/generate-unique-id';

class EventBusHandler {
    constructor(store) {
        if (!store) {
            return new Error('EventBusHandler.constructor: store is not defined.');
        }

        this.store = store;
    }

    subscribe(eventName, fn, moduleName) {
        if (!eventName) {
            throw new Error('EventBusHandler.subscribe: eventName is not defined.');
        }

        if (typeof eventName !== 'string') {
            throw new Error('EventBusHandler.subscribe: eventName is not a string value.');
        }

        if (!fn) {
            throw new Error('EventBusHandler.subscribe: fn is not defined.');
        }

        if (typeof fn !== 'function') {
            throw new Error('EventBusHandler.subscribe: fn is not a function.');
        }

        moduleName = moduleName || `EventBus-${generateUniqueId(32)}-${eventName}-${generateUniqueId(16)}`;

        this.store.registerModule(moduleName, {
            actions: {
                [eventName]: (context, payload) => Promise.resolve(fn)
            }
        });

        return moduleName;
    }

    unsubscribe(moduleName) {
        if (!moduleName) {
            throw new Error('EventBusHandler.unsubscribe: moduleName is not defined.');
        }

        if (typeof moduleName !== 'string') {
            throw new Error('EventBusHandler.unsubscribe: moduleName is not a string value.');
        }

        this.store.unregisterModule(moduleName);
    }

    send(eventName, payload) {
        if (!eventName) {
            throw new Error('EventBusHandler.send: eventName is not defined.');
        }

        if (typeof eventName !== 'string') {
            throw new Error('EventBusHandler.send: eventName is not a string value.');
        }

        const result = this.store.dispatch(eventName);

        if (!result) {
            return result;
        }

        return result.then(dispatchPayload => {
            const $event = {
                name: eventName,
                handled: false
            };

            if (dispatchPayload) {
                if (dispatchPayload instanceof Array) {
                    const fnList = [];

                    if (dispatchPayload.length) {
                        fnList.push(...dispatchPayload.reverse());
                    }

                    const result = [];

                    for (const fn of fnList) {
                        try {
                            result.push(fn(payload, $event));

                            if ($event.handled) {
                                break;
                            }
                        }
                        catch (error) {
                            return Promise.reject(error);
                        }
                    }

                    return Promise.resolve(result);
                }
                else {
                    try {
                        return dispatchPayload(payload, $event);
                    }
                    catch (error) {
                        return Promise.reject(error);
                    }
                }
            }

            return Promise.resolve();
        });
    }
}

const plugin = {
    install(Vue, store) {
        const eventBus = new EventBusHandler(store);

        const mixin = {
            created() {
                const vm = this;

                vm.eventBusModuleNamePrefix = `EventBus-${generateUniqueId(32)}`;

                vm.eventBusRegistry = [];

                vm.eventBus = {
                    subscribe(eventName, fn) {
                        const moduleName = `${vm.eventBusModuleNamePrefix}-${eventName}-${generateUniqueId(16)}`;

                        eventBus.subscribe(eventName, fn, moduleName);

                        vm.eventBusRegistry.push(moduleName);

                        return moduleName;
                    },

                    unsubscribe(moduleName) {
                        if (vm.eventBusRegistry && vm.eventBusRegistry.length) {
                            const index = vm.eventBusRegistry.indexOf(moduleName);

                            if (index > -1) {
                                vm.eventBusRegistry.splice(index, 1);
                            }
                        }

                        return eventBus.unsubscribe(moduleName);
                    },

                    send(eventName, payload) {
                        return eventBus.send(eventName, payload);
                    }
                };
            },

            beforeDestroy() {
                const vm = this;

                if (vm.eventBusRegistry && vm.eventBusRegistry.length) {
                    vm.eventBusRegistry.forEach(moduleName => eventBus.unsubscribe(moduleName));
                    vm.eventBusRegistry = null;
                }
            }
        };

        Vue.mixin(mixin);
    }
};

export function setupPlugin(Vue, store) {
    Vue.use(plugin, store);
}