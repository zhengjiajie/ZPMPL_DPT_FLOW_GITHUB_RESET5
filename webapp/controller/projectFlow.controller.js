sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"ppmflow/lib/Events"
], function(Controller, Events) {
	"use strict";

	return Controller.extend("ppmflow.controller.projectFlow", {

		onInit: function() {
			this.getView().setModel(new sap.ui.model.resource.ResourceModel({
				bundleName: "ppmflow.i18n.i18n"
			}), "i18n");
		},

		backend: null,

		searchTasksChanged: function(oEvent) {
			var oSearchField = this.byId('__searchField0');
			var searchModel = oEvent.getParameters().model;
			oSearchField.setModel(new sap.ui.model.json.JSONModel(searchModel));
		},

		onSuggest: function(oEvent) {
			var oSearchField = this.byId('__searchField0');
			var value = oEvent.getParameter("suggestValue");
			var filters = [];
			if (value) {
				filters = [new sap.ui.model.Filter([
					new sap.ui.model.Filter("name", function(sDes) {
						return (sDes || "").toUpperCase().indexOf(value.toUpperCase()) > -1;
					})
				], false)];
			}

			oSearchField.getBinding("suggestionItems").filter(filters);

			oSearchField.suggest();
		},

		onSearch: function(oEvent) {
			var item = oEvent.getParameter("suggestionItem");
			if (item) {
				var oGraph = this.byId('__flowChart0');
				oGraph.centerTask(item.getKey());
			}
		},

		handleContextMenuFiredByBackend: function(e) {
			var oGraph = this.byId('__flowChart0');
			oGraph.contextMenuFromBackend(e);
		},

		nodeDblClick: function(oEvent) {
			if (this.backend) {

				var param = {};
				param.id = oEvent.getParameters().task.customId;
				if (oEvent.getParameters().task.actualId && oEvent.getParameters().task.actualId !== "") {
					param.id = oEvent.getParameters().task.actualId;
				}
				param.state = oEvent.getParameters().state;

				this.backend.nodeDblClick(param);
			}
		},

		queryState: function() {
			var oGraph = this.byId('__flowChart0');
			var flowState = oGraph.getState();
			if (this.backend) {
				this.backend.respondQueryState(flowState);
			}
		},

		deactivateToListType: function(deactivate) {
			if (deactivate) {
				return sap.m.ListType.Inactive;
			}
			return sap.m.ListType.Active;
		},

		toggleLegend: function(oEvent) {
			var oGraph = this.byId('__flowChart0');
			var showLegend = oEvent.getParameters().pressed;
			if (showLegend) {
				oGraph.showLegend();
			} else {
				oGraph.hideLegend();
			}
		},

		hideTooltip: function(oEvent) {
			if (this._oTooltip) {
				this._oTooltip.close();
			}
		},

		tooltipClosed: function(oEvent) {
			if (this._oTooltip) {
				this._oTooltip = null;
			}
		},

		showTooltip: function(oEvent) {
			if (this._oContextMenu) {
				return;
			}
			var tooltipData = oEvent.getParameters().tooltipData;
			var openByElement = oEvent.getParameters().openByElement;

			if (tooltipData && openByElement) {
				// create tooltip
				if (!this._oTooltip) {
					this._oTooltip = sap.ui.xmlfragment("ppmflow.fragment.tooltip", this);
					this.getView().addDependent(this._oTooltip);

					this._oTooltip.setModel(new sap.ui.model.json.JSONModel(tooltipData));

					jQuery.sap.delayedCall(0, this, function() {
						if (this._oTooltip) {
							this._oTooltip.openBy(openByElement);
						}
					});
				}
			}
		},

		tooltipOpened: function(oEvent) {
			if (this._oTooltip) {
				// Events.disableScroll(window);
			}
		},

		contextMenuClosed: function(oEvent) {
			if (this._oContextMenu) {
				this._oContextMenu = null;
			}
		},

		contextMenuOpened: function(oEvent) {
			if (this._oContextMenu) {}
		},

		openContextMenu: function(oEvent) {
			if (this._oTooltip) {
				this._oTooltip.close();
			}
			var contextMenuData = oEvent.getParameters().contextMenuData;
			var openByElement = oEvent.getParameters().openByElement;

			if (contextMenuData && openByElement) {
				// create popover
				this._oContextMenu = sap.ui.xmlfragment("ppmflow.fragment.contextmenu", this);
				this.getView().addDependent(this._oContextMenu);

				this._oContextMenu.setModel(new sap.ui.model.json.JSONModel(contextMenuData));

				// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
				jQuery.sap.delayedCall(0, this, function() {
					if (this._oContextMenu) {
						this._oContextMenu.openBy(openByElement);
					}
				});
			}
		},

		contextMenuItemSelected: function(oEvent) {
			if (this.backend) {
				var contextMenuData = this._oContextMenu.getModel().getData();
				var actionName = oEvent.getSource().getName();
				var param = {};
				param.taskId = contextMenuData.taskId;
				param.name = actionName;

				this.backend.contextMenuItemSelected(param);
			}
			this._oContextMenu.close();
		},

		zoomChangedFromFlow: function(oEvent) {
			var scale = oEvent.getParameters().scale;
			var oSlider = this.byId('__slider0');
			if (oSlider) {
				oSlider.setValue(scale);
			}
		},

		zoomChanged: function(oEvent) {
			var scale = oEvent.getParameters().value;
			if (scale) {
				var oGraph = this.byId('__flowChart0');
				oGraph.zoom(scale / 100);
			}
		}

	});

});