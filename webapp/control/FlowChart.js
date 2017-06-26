sap.ui.define(
	["sap/ui/core/Control", "ppmflow/control/Task", "ppmflow/control/Milestone", "ppmflow/control/MainTask", "ppmflow/control/Legend",
		"sap/ui/thirdparty/d3",
		"dagreD3", "ppmflow/lib/Graph", "ppmflow/thirdparty/svg4everybody"
	],
	function(Control, Task, Milestone, MainTask, Legend, d3, dagreD3, graph) {
		return Control.extend("ppmflow.control.FlowChart", {
			_graph: null,
			metadata: {
				properties: {
					data: {
						type: "object"
					},
					isProjectFlow: {
						type: "boolean",
						defaultValue: false
					}
				},
				events: {
					"nodeDblClick": {},
					"contextMenu": {},
					"showTooltip": {},
					"hideTooltip": {},
					"zoomChanged": {},
					"newTasks": {}
				},
				aggregations: {
					_html: {
						type: "sap.ui.core.HTML",
						multiple: false,
						visibility: "hidden"
					},
					_icons: {
						type: "sap.ui.core.HTML",
						multiple: false,
						visibility: "hidden"
					}
				}
			},

			init: function() {
				svg4everybody();
				this._sContainerId = this.getId() + "--container";
				this.setAggregation("_html", new sap.ui.core.HTML({
					content: "<svg class='flowCanvas' width='100%' height='100%' id='" + this._sContainerId + "'></svg>"
				}));
				this.setAggregation("_icons", new sap.ui.core.HTML({
					content: "<svg style='display:none;'>" +
						"   <defs>" +
						"		<symbol id='icon-uniE1DA' viewBox='0 0 500 500'>" +
						"			<title>uniE1DA</title>" +
						"			<path d='M15 8v7h-7v2h7v7h2v-7h7v-2h-7v-7h-2zM28 2h-16v2h16v24h-24v-8h-2v8q0 0.813 0.563 1.406t1.438 0.594h24q0.813 0 1.406-0.594t0.594-1.406v-24q0-0.875-0.594-1.438t-1.406-0.563zM0.438 1.75q-0.75-0.688 0-1.438 0.313-0.313 0.688-0.313t0.688 0.313l5.75 6.188q0.563 0.625 0.563 1.438t-0.563 1.375l-5.75 6.313q-0.313 0.313-0.719 0.313t-0.719-0.313-0.313-0.719 0.313-0.719l5.438-5.938q0.375-0.313 0-0.688z'></path>" +
						"		</symbol>" +
						"		<symbol id='icon-uniE1D9' viewBox='0 0 500 500'>" +
						"			<title>uniE1D9</title>" +
						"			<path d='M8 17h16v-2h-16v2zM28 2h-8v2h8v24h-24v-16h-2v16q0 0.875 0.563 1.438t1.438 0.563h24q0.813 0 1.406-0.563t0.594-1.438v-24q0-0.813-0.594-1.406t-1.406-0.594zM14.188 2.375q0.688-0.75 1.438 0 0.313 0.313 0.313 0.688t-0.313 0.688l-6.188 5.75q-0.625 0.563-1.438 0.563t-1.375-0.563l-6.313-5.75q-0.313-0.313-0.313-0.719t0.313-0.719 0.719-0.313 0.719 0.313l5.938 5.438q0.313 0.375 0.688 0z'></path>" +
						"		</symbol>" +
						"	</defs>" +
						"</svg>"
				}));
			},

			renderer: function(oRm, oControl) {
				oRm.write("<div");
				oRm.writeControlData(oControl);
				oRm.addClass("ppmFlowChart");
				oRm.writeClasses();
				oRm.write(">");
				oRm.renderControl(oControl.getAggregation("_icons"));
				oRm.renderControl(oControl.getAggregation("_html"));
				oRm.write("</div>");
			},

			onAfterRendering: function() {

				var oModel = this.getData();

				if (!(oModel && oModel.tasks && oModel.relationships)) return;

				if (oModel.update && this._graph) {
					this._updateChart(oModel);
				} else {

					this.getAggregation("_html").findElements().forEach(function(element) {
						element.destroy();
					});
					var svg = d3.select("#" + this._sContainerId);
					if (svg) {
						svg.selectAll("*").remove();
					}

					this._createChart(oModel);
					this._setLayout(oModel);

					if (!this.getIsProjectFlow()) {
						if (oModel.editmode) {
							this._displayAnchors();
						}
					}
				}
			},

			exit: function() {

				var svg = d3.select("#" + this._sContainerId);
				if (this._graph) {
					delete this._graph;
				}

				if (svg) {
					svg.selectAll("*").remove();
				}

			},

			getLayout: function() {

				var svg = d3.select("#" + this._sContainerId);

				var parentGraph = this._graph;
				var layout = {
					nodes: [],
					edges: [],
					viewposX: "0",
					viewposY: "0",
					scale: "0",
					nodeStates: []
				};

				svg.selectAll('g.node').each(function(nodeId) {
					var nodeLayout = {
						id: "",
						name: "",
						x: 0,
						y: 0
					};
					var graphNode = parentGraph.node(nodeId);
					if (graphNode) {
						var oControl = sap.ui.getCore().byId(graphNode.elem.childNodes[1].firstChild.id);
						nodeLayout.id = nodeId;
						nodeLayout.name = oControl.getName();
						nodeLayout.x = graphNode.x;
						nodeLayout.y = graphNode.y;
						layout.nodes.push(nodeLayout);
						if (oControl.getMetadata().getName() === "ppmflow.control.MainTask") {
							nodeLayout.subnodeslayout = oControl.getLayout();
						} else {
							nodeLayout.subnodeslayout = {
								nodes: [{
									id: "",
									name: "",
									x: "",
									y: ""
								}],
								edges: [{
									id: "",
									from: "",
									to: "",
									points: [{
										x: "",
										y: ""
									}]
								}]
							};
						}
					}
				});

				svg.selectAll('g.edgePath').each(function(edgePath) {
					var edgeLayout = {
						id: "",
						from: "",
						to: "",
						points: [{
							x: "",
							y: ""
						}]
					};
					var graphEdge = parentGraph.edge(edgePath);
					if (graphEdge) {
						edgeLayout.id = graphEdge.customId;
						edgeLayout.from = edgePath.v;
						edgeLayout.to = edgePath.w;
						edgeLayout.points = graphEdge.points;
						layout.edges.push(edgeLayout);
					}
				});
				if (layout.edges.length === 0) {
					layout.edges.push({
						id: "",
						from: "",
						to: "",
						points: [{
							x: "",
							y: ""
						}]
					});
				}

				var state = this.getState();
				layout.viewposX = state.viewposX;
				layout.viewposY = state.viewposY;
				layout.scale = state.scale;
				layout.nodeStates = state.nodeStates;

				return layout;
			},

			getSVGXml: function() {
				var svg = d3.select("#" + this._sContainerId);
				var svgXml = (new XMLSerializer()).serializeToString(svg[0][0]);
				return svgXml;
			},

			showLegend: function() {
				var svg = d3.select("#" + this._sContainerId);

				this._legendContainer = svg.append("g")
					.attr("transform", "translate(10,10)");

				var legend = new Legend();
				legend.placeAt(this._legendContainer[0][0]);
			},

			hideLegend: function() {
				if (this._legendContainer) {
					this._legendContainer.remove();
				}
			},

			_createChart: function(oModel) {

				var svg = d3.select("#" + this._sContainerId);
				var inner = svg.append("g").attr("transform", "translate(0,1)");

				this._graph = graph.initGraph();

				var parentGraph = this._graph;
				var flowControl = this;
				var subCharts = [];

				var editmode = oModel.editmode;
				for (var i = 0; i < oModel.tasks.length; i++) {
					var task = oModel.tasks[i];
					var idTask = task.id;

					if (task.isMainTask && task.isMainTask === "X") {

						parentGraph.setNode(idTask, {
							shape: "flowMainTask",
							label: task.name,
							description: task.description,
							status: task.status,
							customId: idTask,
							actualId: task.actualId,
							height: 50,
							width: 150,
							task: task,
							rx: 10,
							ry: 10,
							borderSize: 1,
							editmode: editmode,
							flowControl: flowControl,
							isProjectFlow: flowControl.getIsProjectFlow(),
							color: task.color
						});

					} else {
						parentGraph.setNode(idTask, {
							shape: "flowTask",
							label: task.name,
							description: task.description,
							status: task.status,
							customId: idTask,
							actualId: task.actualId,
							height: 50,
							width: 150,
							rx: 10,
							ry: 10,
							borderSize: 1,
							editmode: editmode,
							flowControl: flowControl,
							isProjectFlow: flowControl.getIsProjectFlow(),
							color: task.color
						});
					}
				}

				oModel.milestones.forEach(function(milestone) {
					var idMilestone = milestone.id;
					parentGraph.setNode(idMilestone, {
						shape: "flowMilestone",
						label: milestone.name,
						description: milestone.description,
						status: milestone.status,
						customId: idMilestone,
						actualId: milestone.actualId,
						height: 70,
						width: 84,
						rx: 10,
						ry: 10,
						borderSize: 1,
						editmode: editmode,
						flowControl: flowControl,
						isProjectFlow: flowControl.getIsProjectFlow(),
						color: milestone.color
					});
				});

				oModel.relationships.forEach(function(relationship) {
					var fromTask = relationship.from;
					var toTask = relationship.to;
					parentGraph.setEdge(fromTask, toTask, {
						arrowhead: "normal",
						arrowheadStyle: "fill: #383838"
					});
				});

				parentGraph.edges().forEach(function(e) {
					var edge = parentGraph.edge(e.v, e.w);
					edge.customId = e.v + "-" + e.w;
				});

				subCharts.forEach(function(subChart) {
					flowControl._flowChartRenderer()(subChart.inner, subChart.g);

				});

				var render = this._flowChartRenderer();
				render(inner, parentGraph);

				svg.select("#ppmflowTempGroup").remove();

				if (oModel.layout && oModel.layout[0].centerTask) {
					this._zoom = graph.customizeGraph(this, svg, inner, oModel.flowUpperContainerId, parentGraph, oModel.editmode, oModel.layout[0].taskInFocus,
						false, null, null, null);
				} else if (oModel.layout) {
					this._zoom = graph.customizeGraph(this, svg, inner, oModel.flowUpperContainerId, parentGraph, oModel.editmode, oModel.layout[0].taskInFocus,
						true, oModel.layout[0].viewposX,
						oModel.layout[0].viewposY, oModel.layout[0].scale);
				} else {
					this._zoom = graph.customizeGraph(this, svg, inner, oModel.flowUpperContainerId, parentGraph, oModel.editmode, null, true, 1, 0, 1);
				}

				$(svg[0][0]).parentsUntil(".ppmFlowContainer").css("height", "100%");
				$(svg[0][0]).parentsUntil(".ppmFlowContainer").css("width", "100%");
				$(svg[0][0]).css("height", "2000px");

				this._setNewTasks();
			},

			centerTask: function(nodeId) {
				var parentGraph = this._graph;
				var centerNode = parentGraph.node(nodeId);
				if (centerNode) {
					var tranX = -(+centerNode.x) + 800;
					var tranY = -(+centerNode.y) + 300;
					this._interpolateZoom([tranX, tranY], 1);
					this.highlightOn(centerNode);
				}
			},

			_setLayout: function(oModel) {
				var oControl = this;
				var parentGraph = this._graph;
				var svg = d3.select("#" + this._sContainerId);
				var inner = svg[0][0].firstChild;

				if (oModel.layout[0]) {
					if (oModel.layout[0].nodes) {
						oModel.layout[0].nodes.forEach(function(nodeLayout) {
							var node = parentGraph.node(nodeLayout.id);
							if (node) {
								node.x = +nodeLayout.x;
								node.y = +nodeLayout.y;
								$("#node" + nodeLayout.id).attr("transform", "translate(" + node.x + "," + node.y + ")");
								graph.recalculateEdgesForNode(oControl, svg, inner, parentGraph, nodeLayout.id);
								if (nodeLayout.subnodeslayout && node.task) {
									node.task.layout = nodeLayout.subnodeslayout;
								}
							}
						});
					}

					if (oModel.layout[0].edges) {
						oModel.layout[0].edges.forEach(function(edgeLayout) {
							var edge = parentGraph.edge(edgeLayout.from, edgeLayout.to);
							if (edge) {
								edge.points = edgeLayout.points;

								var path = "M" + edge.points[0].x + "," + edge.points[0].y;
								for (var i = 1; i < edge.points.length; i++) {
									path += "L" + edge.points[i].x + "," + edge.points[i].y;
								}

								$("#" + edgeLayout.id).attr("d", path);
							}
						});
					}

					if (oModel.layout[0].nodeStates) {
						oModel.layout[0].nodeStates.forEach(function(nodeState) {
							var node = parentGraph.node(nodeState.id);
							if (node) {
								if (nodeState.state && node.task) {
									node.task.state = nodeState.state;
								}
							}
						});
					}
				}
			},

			_updateChart: function(oModel) {

				var parentGraph = this._graph;
				var svg = d3.select("#" + this._sContainerId);

				if (oModel.tasks) {
					for (var i = 0; i < oModel.tasks.length; i++) {
						var flowNode = oModel.tasks[i];
						var node = parentGraph.node(flowNode.id);

						if (node) {

							var controlId;
							if (node.elem.childNodes[1] && node.elem.childNodes[1].firstChild) {
								controlId = node.elem.childNodes[1].firstChild.id;
							}

							if (controlId) {
								var oControl = sap.ui.getCore().byId(controlId);
								node.actualId = flowNode.actualId;
								node.label = flowNode.name;
								node.color = flowNode.color;
								node.status = flowNode.status;
								oControl.setActualId(node.actualId);
								oControl.setName(node.label);
								oControl.setColor(node.color);
								oControl.setStatus(node.status);
								if (node.task) {
									node.task = flowNode;
									oControl.setTask(node.task);
								}
							}
						}
					}
				}

				if (oModel.milestones) {
					for (var i = 0; i < oModel.milestones.length; i++) {
						var flowMilestone = oModel.milestones[i];
						var node = parentGraph.node(flowMilestone.id);
						if (node) {

							var controlId;
							if (node.elem.childNodes[1] && node.elem.childNodes[1].firstChild) {
								controlId = node.elem.childNodes[1].firstChild.id;
							}

							if (controlId) {
								var oControl = sap.ui.getCore().byId(controlId);
								node.actualId = flowMilestone.actualId;
								node.label = flowMilestone.name;
								node.color = flowMilestone.color;
								node.status = flowMilestone.status;
								oControl.setActualId(node.actualId);
								oControl.setName(node.label);
								oControl.setColor(node.color);
								oControl.setStatus(node.status);
							}
						}
					}
				}

				var containerHeight = 2000;

				$(svg[0][0]).parentsUntil(".ppmFlowContainer").css("height", containerHeight);
				$(svg[0][0]).parentsUntil(".ppmFlowContainer").css("width", "100%");
			},

			getState: function() {

				var svg = d3.select("#" + this._sContainerId);
				var parentGraph = this._graph;
				var pan = d3.select("#" + this._sContainerId)[0][0].firstChild.transform;
				var state = {
					viewposX: "0",
					viewposY: "0",
					scale: "0",
					nodeStates: []
				};

				if (pan) {
					state.viewposX = pan.baseVal.getItem(0).matrix.e.toString();
					state.viewposY = pan.baseVal.getItem(0).matrix.f.toString();
					if (pan.baseVal.getItem(1)) {
						state.scale = pan.baseVal.getItem(1).matrix.a.toString();
					} else {
						state.scale = "1";
					}
				}

				svg.selectAll('g.node').each(function(nodeId) {
					var nodeState = {
						id: "",
						state: ""
					};
					var graphNode = parentGraph.node(nodeId);
					if (graphNode) {
						var oControl = sap.ui.getCore().byId(graphNode.elem.childNodes[1].firstChild.id);
						nodeState.id = nodeId;
						if (oControl.getMetadata().getName() === "ppmflow.control.MainTask") {
							nodeState.state = oControl.getState();
							state.nodeStates.push(nodeState);
						}
					}
				});

				if (state.nodeStates.length === 0) {
					state.nodeStates.push({
						id: "",
						state: ""
					});
				}

				return state;
			},

			contextMenuFromBackend: function(e) {
				var elem = e.srcElement;

				while (elem && elem.id.substr(0, 4) !== "node") {
					elem = elem.parentNode;
				}
				if (!elem) {
					return;
				}

				var parentGraph = this._graph;
				var graphNode = parentGraph.node(elem.id.substr(4));
				if (graphNode) {
					e.cancelBubble = true;
					this.nodeClick(graphNode, e);
				} else {
					// probably a subtask
					var mainTaskElem = elem.parentNode;
					while (mainTaskElem && mainTaskElem.id.substr(0, 4) !== "node") {
						mainTaskElem = mainTaskElem.parentNode;
					}
					if (!mainTaskElem) {
						return;
					}

					graphNode = parentGraph.node(mainTaskElem.id.substr(4));
					if (graphNode) {
						var oControl = sap.ui.getCore().byId(graphNode.elem.childNodes[1].firstChild.id);
						if (oControl.getMetadata().getName() === "ppmflow.control.MainTask") {
							var innerGraph = oControl.getGraph();
							var subtaskId = elem.id.substr(4);
							var graphSubNode = innerGraph.node(subtaskId);

							if (!graphSubNode) {
								return;
							}

							var taskData = graphNode.task.subtasks.filter(function(flowSubTask) {
								return flowSubTask.id === subtaskId;
							})[0];

							if (!taskData) {
								return;
							}

							e.cancelBubble = true;
							this.nodeClick(graphSubNode, e, taskData);
						}
					}
				}
			},

			nodeDblClick: function(task) {
				var param = {};
				param.task = task;
				param.state = this.getState();

				d3.event.stopPropagation();
				this.fireNodeDblClick(param);
			},

			nodeHoverOut: function(task) {
				this.highlightOff(task);
				this.fireHideTooltip();
			},

			nodeHover: function(task) {

				var browserEvent = d3.event;
				browserEvent.preventDefault();
				browserEvent.cancelBubble = true;
				this.highlightOn(task);

				var tooltipData = {};
				tooltipData.positionX = 0;
				tooltipData.positionY = 0;
				tooltipData.text = task.description;

				if (!tooltipData.text) {
					return;
				}

				var oMark = $("#" + task.elem.id);

				var param = {};
				param.tooltipData = tooltipData;
				param.openByElement = oMark;

				this.fireShowTooltip(param);
			},

			_getBorderShape: function(task) {
				var shapes;
				switch (task.shape) {
					case "flowMilestone":
						shapes = task.elem.getElementsByTagName("polygon");
						break;
					case "flowMainTask":
						shapes = task.elem.getElementsByTagName("rect");
						break;
					default:
						shapes = task.elem.getElementsByTagName("rect");
				}

				if (!(shapes && shapes[1])) {
					return null;
				} else {
					return shapes[1];
				}
			},

			_getRelatedEdgeElements: function(task) {
				var edges = [];
				var parentGraph = this._graph;
				var taskId = task.customId;

				if (task.mainControl) {
					parentGraph = task.mainControl.getGraph();
				}

				parentGraph.edges().forEach(function(e) {
					if (e.v === taskId || e.w === taskId) {
						var edge = parentGraph.edge(e.v, e.w);
						if (edge) {
							edges.push(edge);
						}
					}
				});

				return edges;
			},

			_getUnconnectedEdges: function(task) {
				var edges = [];
				var parentGraph = this._graph;
				var taskId = task.customId;

				if (task.mainControl) {
					parentGraph.edges().forEach(function(e) {
						var edge = parentGraph.edge(e.v, e.w);
						if (edge) {
							edges.push(edge);
						}
					});
					parentGraph = task.mainControl.getGraph();
				}

				parentGraph.edges().forEach(function(e) {
					if (e.v !== taskId && e.w !== taskId) {
						var edge = parentGraph.edge(e.v, e.w);
						if (edge) {
							edges.push(edge);
						}
					}
				});
				return edges;
			},

			_getConnectedEdges: function(task) {
				var edges = [];
				var parentGraph = this._graph;
				var taskId = task.customId;

				if (task.mainControl) {
					parentGraph.edges().forEach(function(e) {
						var edge = parentGraph.edge(e.v, e.w);
						if (edge) {
							edges.push(edge);
						}
					});
					parentGraph = task.mainControl.getGraph();
				}

				parentGraph.edges().forEach(function(e) {
					if (e.v === taskId || e.w === taskId) {
						var edge = parentGraph.edge(e.v, e.w);
						if (edge) {
							edges.push(edge);
						}
					}
				});
				return edges;
			},

			_getConnectedNodeIds: function(task) {
				var nodeIds = [];
				var parentGraph = this._graph;
				var taskId = task.customId;

				if (task.mainControl) {
					parentGraph = task.mainControl.getGraph();
				}

				nodeIds.push(taskId);
				parentGraph.edges().forEach(function(e) {
					if (e.v === taskId) {
						nodeIds.push(e.w);
					}
					if (e.w === taskId) {
						nodeIds.push(e.v);
					}
				});

				return nodeIds;
			},

			_getUnconnectedNodes: function(task) {
				var nodes = [];
				var parentGraph = this._graph;
				var connectedNodeIds = this._getConnectedNodeIds(task);

				if (task.mainControl) {
					var mainTaskId = task.mainControl.getParentNode().customId;
					parentGraph.nodes().forEach(function(nodeId) {
						if (nodeId !== mainTaskId) {
							var node = parentGraph.node(nodeId);
							if (node) {
								nodes.push(node);
							}
						}
					});
					parentGraph = task.mainControl.getGraph();
				}

				parentGraph.nodes().forEach(function(nodeId) {
					if (connectedNodeIds.indexOf(nodeId) === -1) {
						var node = parentGraph.node(nodeId);
						if (node) {
							nodes.push(node);
						}
					}
				});
				return nodes;
			},

			_getConnectedNodes: function(task) {
				var nodes = [];
				var parentGraph = this._graph;
				var connectedNodeIds = this._getConnectedNodeIds(task);

				if (task.mainControl) {
					var mainTaskId = task.mainControl.getParentNode().customId;
					parentGraph.nodes().forEach(function(nodeId) {
						if (nodeId !== mainTaskId) {
							var node = parentGraph.node(nodeId);
							if (node) {
								nodes.push(node);
							}
						}
					});
					parentGraph = task.mainControl.getGraph();
				}

				parentGraph.nodes().forEach(function(nodeId) {
					if (connectedNodeIds.indexOf(nodeId) !== -1) {
						var node = parentGraph.node(nodeId);
						if (node) {
							nodes.push(node);
						}
					}
				});
				return nodes;
			},

			highlightOff: function(task) {

				var borderShape = this._getBorderShape(task);
				if (borderShape) {
					borderShape.style.strokeWidth = "1";
				}

				var unconnectedNodes = this._getUnconnectedNodes(task);
				unconnectedNodes.forEach(function(node) {
					node.elem.style.opacity = "1";
				});

				var unconnectedEdges = this._getUnconnectedEdges(task);
				unconnectedEdges.forEach(function(edge) {
					edge.elem.style.opacity = "1";
				});
			},

			highlightOn: function(task) {

				var borderShape = this._getBorderShape(task);
				if (borderShape) {
					borderShape.style.strokeWidth = "2";
				}

				var unconnectedNodes = this._getUnconnectedNodes(task);
				unconnectedNodes.forEach(function(node) {
					node.elem.style.opacity = "0.1";
				});

				var connectedNodes = this._getConnectedNodes(task);
				connectedNodes.forEach(function(node) {
					node.elem.style.opacity = "1";
				});

				var unconnectedEdges = this._getUnconnectedEdges(task);
				unconnectedEdges.forEach(function(edge) {
					edge.elem.style.opacity = "0.1";
				});

				var connectedEdges = this._getConnectedEdges(task);
				connectedEdges.forEach(function(edge) {
					edge.elem.style.opacity = "1";
				});
			},

			onSubNodeHoverOut: function(event) {
				var subTask = event.getParameters();
				var flowControl = subTask.mainControl.getParentNode().flowControl;
				flowControl.nodeHoverOut(subTask);
			},

			onSubNodeHover: function(event) {
				var subTask = event.getParameters();
				var flowControl = subTask.mainControl.getParentNode().flowControl;
				flowControl.nodeHover(subTask);
			},

			nodeClick: function(task, e, taskData) {

				var browserEvent = e;
				if (!browserEvent) {
					browserEvent = d3.event;
				}
				browserEvent.preventDefault();
				browserEvent.cancelBubble = true;
				browserEvent.stopPropagation();

				var flowData = this.getData();
				if (!flowData.editmode) {
					return;
				}

				var ctm = task.elem.getScreenCTM();

				var offsetX = browserEvent.clientX - (ctm.e + (task.width / 2) * ctm.a);
				var offsetY = browserEvent.clientY - ctm.f;

				if (!taskData) {
					switch (task.shape) {
						case "flowMilestone":
							taskData = flowData.milestones.filter(function(flowMilestone) {
								return flowMilestone.id === task.customId;
							})[0];
							break;
						case "flowMainTask":
							break;
						default:
							taskData = flowData.tasks.filter(function(flowTask) {
								return flowTask.id === task.customId;
							})[0];
					}
				}

				if (taskData && taskData.commands && taskData.commands.length > 0) {
					var contextMenuData = {};

					contextMenuData.taskId = taskData.id;
					if (taskData.actualId && taskData.actualId !== "") {
						contextMenuData.taskId = taskData.actualId;
					}
					contextMenuData.commands = taskData.commands;
					contextMenuData.commands.forEach(function(command) {
						var description = flowData.commands.filter(function(commandDescription) {
							return commandDescription.name === command.name;
						})[0];

						if (description) {
							command.description = description.text;
						} else {
							command.description = command.name;
						}

						if (!flowData.editmode) {
							command.deactivate = true;
						}
					});
					contextMenuData.positionX = Math.round(offsetX);
					contextMenuData.positionY = Math.round(offsetY);

					var oMark = $("#" + task.elem.id);

					var param = {};
					param.contextMenuData = contextMenuData;
					param.openByElement = oMark;

					this.fireContextMenu(param);
				}
			},

			stopPropagation: function() {
				d3.event.stopPropagation();
			},

			onSubNodeDblClick: function(event) {
				var subTask = event.getParameters();
				var flowControl = subTask.mainControl.getParentNode().flowControl;
				var param = {};
				param.task = subTask;
				param.state = flowControl.getState();

				d3.event.stopPropagation();
				event.preventDefault();
				flowControl.fireNodeDblClick(param);
			},

			onSubNodeClick: function(event) {
				var subTask = event.getParameters();
				var flowControl = subTask.mainControl.getParentNode().flowControl;
				var mainTaskId = subTask.mainControl.getTask().id;
				var flowData = flowControl.getData();

				if (!mainTaskId) {
					return;
				}

				var mainTaskData = flowData.tasks.filter(function(flowTask) {
					return flowTask.id === mainTaskId;
				})[0];

				if (!mainTaskData) {
					return;
				}

				var taskData = mainTaskData.subtasks.filter(function(flowSubTask) {
					return flowSubTask.id === subTask.customId;
				})[0];

				if (!taskData) {
					return;
				}

				flowControl.nodeClick(subTask, d3.event, taskData);
			},

			_anchorDblClick: function(edge, anchor) {

				d3.event.stopPropagation();
				var pointsArray = edge.points;
				var clickedPoint;
				var clickedPointIndex;
				for (var i = 1; i < pointsArray.length - 1; i++) {
					if (clickedPoint) continue;
					var point = pointsArray[i];
					if ((anchor.id.x - point.x) * (anchor.id.x - point.x) + (anchor.id.y - point.y) * (anchor.id.y - anchor.id.y) <= 25) {
						clickedPoint = point;
						clickedPointIndex = i;
					}
				}

				if (clickedPoint) {
					edge.points.splice(clickedPointIndex, 1);
					var path = "M" + edge.points[0].x + "," + edge.points[0].y;
					for (var i = 1; i < edge.points.length; i++) {
						path += "L" + edge.points[i].x + "," + edge.points[i].y;
					}

					$('#' + edge.customId).attr('d', path);
					anchor.circle.remove();
				}

			},

			zoom: function(scale) {
				var svg = d3.select("#" + this._sContainerId);
				var inner = svg[0][0].firstChild;
				if (inner) {
					var newScale = "scale(" + scale + ")";
					var oldTransform = inner.getAttribute("transform");
					var offsetStart = oldTransform.search("translate");
					var offsetEnd = oldTransform.search(/[)]/g);
					var oldTranslate = oldTransform.substr(offsetStart, offsetEnd - offsetStart);
					var offset = oldTranslate.search(",");
					if (offset === -1) {
						offset = oldTranslate.search(" ");
					}

					var oldTranslateX = oldTranslate.substr(10, offset - 10);
					var oldTranslateY = oldTranslate.substr(offset + 1);
					oldTranslateX = oldTranslateX.replace(/[ ]/g, "");
					oldTranslateY = oldTranslateY.replace(/[ ]/g, "");

					offsetStart = oldTransform.search("scale");
					offsetEnd = oldTransform.substr(offsetStart).search(/[)]/g);
					var oldScale = oldTransform.substr(offsetStart + 6, offsetEnd - 6);

					var newTranslateX = Math.round(+oldTranslateX / oldScale * scale);
					var newTranslateY = Math.round(+oldTranslateY / oldScale * scale);

					if (this._zoom) {
						this._interpolateZoom([newTranslateX, newTranslateY], scale);
					} else {
						inner.setAttribute("transform", "translate(" + newTranslateX + "," + newTranslateY + ")" + newScale);
					}
				}
			},

			_setNewTasks: function() {
				var oModel = this.getData();
				var taskModel = {
					tasks: []
				};

				oModel.tasks.forEach(function(task) {
					var taskData = {};
					taskData.name = task.name;
					taskData.id = task.id;
					taskModel.tasks.push(taskData);
					if (task.subtasks && task.subtasks.length > 0) {
						task.subtasks.forEach(function(subtask) {
							var subtaskData = {};
							subtaskData.name = subtask.name;
							subtaskData.id = task.id;
							taskModel.tasks.push(subtaskData);
						});
					}
				});

				oModel.milestones.forEach(function(mile) {
					var taskData = {};
					taskData.name = mile.name;
					taskData.id = mile.id;
					taskModel.tasks.push(taskData);
				});

				this.fireNewTasks({
					model: taskModel
				});
			},

			_zoomed: function() {
				var svg = d3.select("#" + this._sContainerId);
				var inner = svg[0][0].firstChild;
				inner.setAttribute("transform",
					"translate(" + this._zoom.translate() + ")" +
					"scale(" + this._zoom.scale() + ")"
				);
			},

			_interpolateZoom: function(translate, scale) {
				var self = this;
				return d3.transition().duration(0).tween("zoom", function() {
					var iTranslate = d3.interpolate(self._zoom.translate(), translate),
						iScale = d3.interpolate(self._zoom.scale(), scale);
					return function(t) {
						self._zoom
							.scale(iScale(t))
							.translate(iTranslate(t));
						self._zoomed();
					};
				});
			},

			_displayAnchors: function() {
				var g = this._graph;
				var oControl = this;

				g.edges().forEach(function(e) {
					var edge = g.edge(e.v, e.w);
					edge.anchors = [];

					var pointsArray = edge.points;

					for (var i = 1; i < pointsArray.length - 1; i++) {
						var point = pointsArray[i];
						var anchor = {};
						anchor.circle = d3.select(edge.elem.parentNode).append("circle")
							.attr('class', 'edgeAnchor')
							.attr("cx", point.x)
							.attr("cy", point.y)
							.attr("r", 5);
						anchor.id = point;
						anchor.circle.on("dblclick", function(edge, anchor) {
							return function() {
								oControl._anchorDblClick(edge, anchor);
							};
						}(edge, anchor));
						edge.anchors.push(anchor);
					}

					edge.startAnchor = {};
					edge.startAnchor.circle = d3.select(edge.elem.parentNode).append("circle")
						.attr('class', 'startAnchor')
						.attr("cx", pointsArray[0].x)
						.attr("cy", pointsArray[0].y)
						.attr("r", 5);
					edge.startAnchor.id = pointsArray[0];

					function dragstarted(d) {
						d3.event.sourceEvent.stopPropagation();
					}

					function dragged(edge, anchor, index) {
						anchor.circle
							.attr("cx", d3.event.dx + d3.event.x)
							.attr("cy", d3.event.dy + d3.event.y);
						edge.points[index].x = d3.event.dx + d3.event.x;
						edge.points[index].y = d3.event.dy + d3.event.y;
						var path = "M" + edge.points[0].x + "," + edge.points[0].y;
						for (var i = 1; i < edge.points.length; i++) {
							path += "L" + edge.points[i].x + "," + edge.points[i].y;
						}

						$('#' + edge.customId).attr('d', path);

					}

					function dragended(d) {}

					var startAnchorDrag = d3.behavior.drag()
						.on("dragstart", dragstarted)
						.on("drag", function(edge, anchor, index) {
							return function() {
								dragged(edge, anchor, index);
							};
						}(edge, edge.startAnchor, 0))
						.on("dragend", dragended);

					edge.endAnchor = {};
					edge.endAnchor.circle = d3.select(edge.elem.parentNode).append("circle")
						.attr('class', 'endAnchor')
						.attr("cx", pointsArray[pointsArray.length - 1].x)
						.attr("cy", pointsArray[pointsArray.length - 1].y)
						.attr("r", 5);
					edge.endAnchor.id = pointsArray[pointsArray.length - 1];

					var endAnchorDrag = d3.behavior.drag()
						.on("dragstart", dragstarted)
						.on("drag", function(edge, anchor, index) {
							return function() {
								dragged(edge, anchor, index);
							};
						}(edge, edge.endAnchor, pointsArray.length - 1))
						.on("dragend", dragended);

					startAnchorDrag.call(edge.startAnchor.circle);
					endAnchorDrag.call(edge.endAnchor.circle);

				});
			},

			_flowChartRenderer: function() {
				var render = new dagreD3.render();
				render.shapes().flowTask = this._flowTaskRenderer;
				render.shapes().flowMainTask = this._flowMainTaskRenderer;
				render.shapes().flowMilestone = this._flowMilestoneRenderer;
				return render;
			},

			_flowTaskRenderer: function(parent, bbox, node) {

				var h = node.height;
				var w = node.width;
				var rx = node.rx;
				var ry = node.ry;
				var borderSize = node.borderSize;

				// make sure element is empty
				parent.selectAll("*").remove();

				// insert standard rectangle shape and hide it
				var shapeSvg = parent.insert("rect", ":first-child")
					.attr("rx", rx)
					.attr("ry", ry)
					.attr("x", -(w / 2 - 2 + borderSize / 2))
					.attr("y", -(h / 2 + borderSize))
					.attr("width", w)
					.attr("height", h)
					.style("opacity", 0);

				// add custom shape container
				var customShape = parent.append("g")
					.attr("width", w)
					.attr("height", h)
					.attr("transform", "translate(" + -(w / 2 - 2 + borderSize / 2) + "," + -(h / 2 + borderSize) + ")");

				// build custom shape and insert it in container
				var task = new Task({
					taskId: node.customId,
					taskGuid: node.customId,
					actualId: node.actualId,
					name: node.label,
					description: "First Task",
					height: h,
					width: w,
					rx: rx,
					ry: ry,
					borderSize: borderSize,
					editmode: node.editmode,
					isProjectFlow: node.isProjectFlow,
					color: node.color,
					status: node.status,
					actions: [{
						id: "addpopop",
						text: "action1",
						description: "first action"
					}]
				});

				if (node.isProjectFlow) {
					parent.on("dblclick", node.flowControl.stopPropagation);
					parent.on("click", node.flowControl.stopPropagation);
					var cc = graph.clickcancel();
					parent.call(cc);
					cc.on("dblclick", function(oNode) {
						return function() {
							oNode.flowControl.nodeDblClick(oNode);
						};
					}(node));
					parent.on("contextmenu", function(oNode) {
						return function() {
							oNode.flowControl.nodeClick(oNode);
						};
					}(node));
				}
				parent.on("mouseover", function(oNode) {
					return function() {
						oNode.flowControl.nodeHover(oNode);
					};
				}(node));
				parent.on("mouseout", function(oNode) {
					return function() {
						oNode.flowControl.nodeHoverOut(oNode);
					};
				}(node));

				task.placeAt(customShape[0][0]);

				// keep same logic as standard rectangle shape
				node.intersect = function(point) {
					return dagreD3.intersect.rect(node, point);
				};

				return shapeSvg;
			},

			_flowMainTaskRenderer: function(parent, bbox, node) {

				var h = 50;
				var w = 150;
				var rx = node.rx;
				var ry = node.ry;
				var borderSize = node.borderSize;

				// make sure element is empty
				parent.selectAll("*").remove();

				// insert standard rectangle shape and hide it
				var shapeSvg = parent.insert("rect", ":first-child")
					.attr("rx", rx)
					.attr("ry", ry)
					.attr("x", -(w / 2 - 2 + borderSize / 2))
					.attr("y", -(h / 2 + borderSize))
					.attr("width", w)
					.attr("height", h)
					.style("opacity", 0);

				// add custom shape container
				var customShape = parent.append("g")
					.attr("width", w)
					.attr("height", h)
					.attr("transform", "translate(" + -(w / 2 - 2 + borderSize / 2) + "," + -(h / 2 + borderSize) + ")");

				// build custom shape and insert it in container
				var task = new MainTask({
					taskId: node.customId,
					taskGuid: node.customId,
					actualId: node.actualId,
					name: node.label,
					description: "First Task",
					rx: rx,
					ry: ry,
					borderSize: borderSize,
					editmode: node.editmode,
					isProjectFlow: node.isProjectFlow,
					nodeDblClick: node.flowControl.onSubNodeDblClick,
					nodeClick: node.flowControl.onSubNodeClick,
					showTooltip: node.flowControl.onSubNodeHover,
					hideTooltip: node.flowControl.onSubNodeHoverOut,
					color: node.color,
					status: node.status,
					actions: [{
						id: "addpopop",
						text: "action1",
						description: "first action"
					}],
					task: node.task,
					parentNode: node
				});

				task.placeAt(customShape[0][0]);

				parent.on("mouseover", function(oNode) {
					return function() {
						oNode.flowControl.nodeHover(oNode);
					};
				}(node));
				parent.on("mouseout", function(oNode) {
					return function() {
						oNode.flowControl.nodeHoverOut(oNode);
					};
				}(node));

				// keep same logic as standard rectangle shape
				node.intersect = function(point) {
					return dagreD3.intersect.rect(node, point);
				};

				return shapeSvg;
			},

			_flowMilestoneRenderer: function(parent, bbox, node) {

				var rx = node.rx;
				var ry = node.ry;
				var borderSize = node.borderSize;

				// make sure element is empty
				parent.selectAll("*").remove();

				var w = node.width,
					h = node.height,
					points = [{
						x: 0,
						y: -h / 2
					}, {
						x: -w / 2,
						y: 0
					}, {
						x: 0,
						y: h / 2
					}, {
						x: w / 2,
						y: 0
					}],
					shapeSvg = parent.insert("polygon", ":first-child")
					.attr("points", points.map(function(p) {
						return p.x + "," + p.y;
					}).join(" "))
					.style("opacity", 0);

				// add custom shape container
				var customShape = parent.append("g")
					.attr("width", w)
					.attr("height", h)
					.attr("transform", "translate(" + -(w / 2 - 2 + borderSize / 2) + "," + -(h / 2 + borderSize) + ")");

				// build custom shape and insert it in container
				var milestone = new Milestone({
					taskId: node.customId,
					taskGuid: node.customId,
					actualId: node.actualId,
					name: node.label,
					description: "First Task",
					height: h,
					width: w,
					rx: rx,
					ry: ry,
					borderSize: borderSize,
					editmode: node.editmode,
					isProjectFlow: node.isProjectFlow,
					color: node.color,
					status: node.status,
					actions: [{
						id: "addpopop",
						text: "action1",
						description: "first action"
					}]
				});

				if (node.isProjectFlow) {
					parent.on("dblclick", node.flowControl.stopPropagation);
					parent.on("click", node.flowControl.stopPropagation);
					var cc = graph.clickcancel();
					parent.call(cc);
					cc.on("dblclick", function(oNode) {
						return function() {
							oNode.flowControl.nodeDblClick(oNode);
						};
					}(node));
					cc.on("click", function(oNode) {
						return function() {
							oNode.flowControl.nodeClick(oNode);
						};
					}(node));
				}
				parent.on("mouseover", function(oNode) {
					return function() {
						oNode.flowControl.nodeHover(oNode);
					};
				}(node));
				parent.on("mouseout", function(oNode) {
					return function() {
						oNode.flowControl.nodeHoverOut(oNode);
					};
				}(node));

				milestone.placeAt(customShape[0][0]);

				node.intersect = function(p) {
					return dagreD3.intersect.polygon(node, points, p);
				};

				return shapeSvg;
			},

			draw: function(oModel) {

			}
		});
	}
);