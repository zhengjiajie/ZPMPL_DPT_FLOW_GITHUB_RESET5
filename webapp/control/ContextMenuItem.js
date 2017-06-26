sap.ui.define(
	["sap/m/ActionListItem"],
	function(ActionListItem) {
		return ActionListItem.extend("ppmflow.control.ContextMenuItem", {
			metadata: {
				properties: {
					name: {
						type: "string"
					}
				}
			},
			renderer: {}
		});
	}
);