var ppmFlow = ppmFlow || {

	webDynproView: null,

	addCallback: function(callback) {
		this.webDynproView = callback;
		var oInterface = this;
		this.webDynproView.addEventListener('contextmenu', function(e) {
			// e.preventDefault();
			// e.cancelBubble = true;
			if (oInterface._flowView) {
				oInterface._flowView.getController().handleContextMenuFiredByBackend(e);
			}
		});
	},

	_flowUpperContainerId: null,

	_flowView: null,

	queryState: function() {
		this._flowView.getController().queryState();
	},

	initialize: function(placeAtEl) {
		if (sap.ui.getCore().byId("ppmflowContainer")) sap.ui.getCore().byId("ppmflowContainer").destroy();

		this._flowView = sap.ui.view({
			id: "ppmflowContainer",
			viewName: "ppmflow.view.flow",
			type: sap.ui.core.mvc.ViewType.XML
		});
		this._flowView.placeAt(placeAtEl);
		this._flowView.getController().backend = this;
		this._flowUpperContainerId = placeAtEl;

		sap.ui.getCore().applyTheme($("script[data-sap-ui-id='flow_bootstrap']").attr("data-sap-ui-theme"));

	},

	initializeProject: function(placeAtEl) {
		if (sap.ui.getCore().byId("ppmflowContainer")) sap.ui.getCore().byId("ppmflowContainer").destroy();

		this._flowView = sap.ui.view({
			id: "ppmflowContainer",
			viewName: "ppmflow.view.projectFlow",
			type: sap.ui.core.mvc.ViewType.XML
		});
		this._flowView.placeAt(placeAtEl);
		this._flowView.getController().backend = this;
		this._flowUpperContainerId = placeAtEl;

		sap.ui.getCore().applyTheme($("script[data-sap-ui-id='flow_bootstrap']").attr("data-sap-ui-theme"));

	},

	saveLayout: function(layout) {
		if (this.webDynproView) {
			this.webDynproView.fireEvent("saveLayout", JSON.stringify(layout));
		}
	},

	respondQueryState: function(state) {
		if (this.webDynproView) {
			this.webDynproView.fireEvent("responseToQueryState", JSON.stringify(state));
		}
	},

	nodeDblClick: function(node) {
		if (this.webDynproView) {
			this.webDynproView.fireEvent("nodeDoubleClicked", JSON.stringify(node));
		}
	},

	contextMenuItemSelected: function(action) {
		if (this.webDynproView) {
			this.webDynproView.fireEvent("contextMenuItemSelected", JSON.stringify(action));
		}
	},

	buildflow: function(modelData) {
		modelData[0].flowUpperContainerId = this._flowUpperContainerId;
		sap.ui.getCore().setModel(new sap.ui.model.json.JSONModel(modelData[0]));

		this.model = modelData[0];
	}
};