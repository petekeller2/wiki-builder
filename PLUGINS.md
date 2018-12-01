# List of Plugins
* No known plugins.

# Writing Plugins
* You should keep in mind when `addPluginReduceActionSteps` gets called in `src.js` (`reduceActionSteps` are executed sequentially).
* A plugin should be exported as an object.
* That object should contain a function named getStep.
* getStep should return `[[specificFunc, [...extraSpecificArgs]], [[actionOnReducedFunc, [...extraActionArgs]]]]`.
* The specific, reduce and action on reduced functions should all be 
found within the exported object.
* Publish the module to npm so others can use the plugin.
* Edit this file, updating the **List of Plugins**.