;(function () {
  
  'use strict';
  
  angular.module('pdb.sequence.viewer', ['d3Core','pdb.sequence.view.filters','pdb.sequence.view.services','pdb.common.services', 'template/sequenceView/pdb.html'])
	.directive('pdbSeqViewer', ['d3', 'seqViewerService', '$compile', '$filter', '$interval', 'commonServices', '$document', '$window', '$q', function(d3, seqViewerService, $compile, $filter, $interval, commonServices, $document, $window, $q){
    
		return{
		  restrict: 'EAC',
		  scope: {
			entryId: '@',
			entityId: '@',
			viewerType: '@',
			settings: '@',
			height: '@',
			width: '@',
			subscribeEvents: '@'
		  },
		  
		  templateUrl: "template/sequenceView/pdb.html",
		  
		  link: function (scope, element, attrs) {
				
				scope.seqViewerOverlay = {
					width: '90%',
					height: '100%',
					'background-color': 'rgba(0,0,0,0.5)',
					color: '#fff',
					'z-index': 1,
					position: 'absolute',
					'text-align': 'center',
					padding: '0 5%',
					'webkit-box-sizing': 'content-box',
					'-moz-box-sizing': 'content-box',
					'box-sizing': 'content-box',
				}
				scope.seqViewerOverlayMessage = {
					'display': 'inline-block',
					'margin-top': '5%',
					'font-size': '12px'
				}
              
				scope.overlayText = 'Loading...';
				
				//Component Element Selectors  
				var directiveEle = d3.select(element[0]);
				var wapperDiv = directiveEle.select('.seqViewerWrapper');
				var topSvgDiv = wapperDiv.select('.topRightSection');
				var bottomSvnDiv = wapperDiv.select('.bottomRightSection');
				var svgEle = bottomSvnDiv.select('.bottomSvg');
				var svgMainGroup = svgEle.select('g.shapesGrp');
				var svgScaleGroup = topSvgDiv.select('g.scaleGrp');
            
				//get parent element dimesions
				var parentDimensions = directiveEle.node().parentNode.getBoundingClientRect();
              
				//default config
				scope.config = {
					width: parentDimensions.width > 230 ? parentDimensions.width : 230,
					height: parentDimensions.height > 250 ? parentDimensions.height : 250, 
					showLabels: true, 
					labelWidth: 80, 
					maxZoomed: false
				}
            
				//extend default configurations with provided options in the 'data-options' attribute
				if( typeof scope.settings != 'undefined' && scope.settings){
					angular.extend(scope.config, JSON.parse(scope.settings));
				}
				if( typeof scope.height != 'undefined'){
					scope.config.height = scope.height;
				}
				if( typeof scope.width != 'undefined'){
					scope.config.width = scope.width;
				}
				if( typeof scope.hideLabels != 'undefined' && scope.hideLabels == 'true'){
					scope.config.showLabels = false;
				}
				
            
				//Default flag settings
				scope.activeViewBtn = 'compact';  //Compact button active on compact/expanded view button
				scope.showViewBtn = true; //Flag to hide/show compact/expanded view button
				scope.allowZoom = true;
				scope.showLoadMoreLink = false;
				scope.chainsViewStatus = 'fewer';
				scope.showLabels = scope.config.showLabels; //To hide/show labels in template
				
				//Set subscribe event to true by default
				if(typeof scope.subscribeEvents == 'undefined'){
					scope.subscribeEvents = 'true';
				}
				
				//Set default viewerType
				if(typeof scope.viewerType == 'undefined' || scope.viewerType !== 'unipdbViewer'){
					scope.viewerType = 'pdbViewer';
				}
            
				//section wise dimension calculation
				var dimensions = new (function(){
					this.margin = {
							top: 15,
							right: 10,
							bottom: 15,
							left: 10
					};
					this.topSvgHeight = 70;
					this.topButtonHeight = 45;
					this.loadChainsBtnSecHeight = 35;
					this.mainHeight = scope.config.height - this.topButtonHeight;
					this.leftSecWidth = scope.config.showLabels ? 80 : 15;
					this.scrollbarWidth = 25;
					this.scrollRightMargin = 5;
					this.mainWidth = scope.config.width;
					this.sectionWidth = this.mainWidth - this.scrollRightMargin;
					this.bottomSecHeigth = this.mainHeight - this.topSvgHeight - this.margin.bottom;
					this.svgWidth = this.sectionWidth - this.leftSecWidth - this.scrollbarWidth;
					this.svgScaleWidth = this.svgWidth - 20;
					this.tickCount = this.svgWidth / 28;
					this.seqViewerSmallOverlay = 'position: absolute;padding: 5px;color: #fff;background-color: rgba(0, 0, 0, 0.498039);width: 27%;font-size: 10px;margin-left: 40%;top:0;text-align:center;'
				})();
            
				//Template Styles
				scope.styles = {
					wrapper: {'width': dimensions.mainWidth+'px', 'height': dimensions.mainHeight+'px'},
					topSection: {'height': dimensions.topSvgHeight+'px', 'width': dimensions.sectionWidth+'px'},
					topSvg: {'height': dimensions.topSvgHeight+'px', 'width': dimensions.svgWidth+'px', overflow: 'visible'},
					bottomSection:  {
									'height': dimensions.bottomSecHeigth+'px',
									'width': dimensions.sectionWidth+'px',
									'overflow-x': 'hidden',
									'overflow-y': 'auto'
									},
					bottomSvg: {'width': dimensions.svgWidth+'px', overflow: 'visible', 'height':'100%'},
					leftSecStyle: {
													'width': (dimensions.leftSecWidth - 5)+'px',
													'text-align': 'right',
														'background': '#DCECD7 none repeat scroll 0% 0%',
														'padding-right': '5px',
													'position': 'relative'
												},
					labelsBg: { 'width': (dimensions.leftSecWidth - 5)+'px', 
										'background': '#DCECD7 none repeat scroll 0% 0%',
									'padding-right': '5px', height: dimensions.mainHeight+'px', position: 'absolute', 'z-index': 0 },
					scrollArrowLeft: {'display': 'none', 'position':'absolute', 'margin': '8px 0 0 '+ (dimensions.leftSecWidth - 10) +'px', 'text-decoration': 'none', 'border':'none', 'outline':'none'},
					scrollArrowRight: {'display': 'none', 'margin': '8px 0 0 20px', 'text-decoration': 'none', 'border':'none', 'outline':'none'},
					loadMoreStyle: {'top': dimensions.mainHeight - 35+'px','left': (dimensions.mainWidth/2) - 50+'px' },
					btnGrp: {'float':'left','margin-bottom':'5px','width': dimensions.mainWidth+'px','text-align':'right','overflow': 'auto'},
				};
            
				
				//storing wrapper size in scope to hide/show template sections
				scope.wrapperSize = {
					width: dimensions.mainWidth,
					height: dimensions.mainHeight
				}
				
				//Validate Mandatory Parameters
				if(scope.viewerType === 'unipdbViewer'){
					scope.overlayText = 'Please use the new \'<pdb-uniprot-viewer>\' component for UniPDB viewer';
					return false;
				}
				if(typeof scope.entryId === 'undefined'){
					scope.overlayText = 'Please specify \'entry-id\'';
					return;
				}else{
					scope.entryId = scope.entryId.toLowerCase()
				}
				if(typeof scope.entityId === 'undefined'){
					scope.overlayText = 'Please specify \'entity-id\'';
					return;
				}
				
				//if tooltip element do not exist append new
				var toolTipEle = d3.select('.pdbSeqTooltip');
				if(toolTipEle[0][0] == null){
					toolTipEle = d3.select('body').append('div').attr('class','pdbSeqTooltip')
				}
            
				//default events
				scope.pdbevents = commonServices.createNewEvent(['PDB.seqViewer.click','PDB.seqViewer.mouseover','PDB.seqViewer.mouseout']);
	      
				//Component class
				var SeqViewerComponent = (function () {
					function SeqViewerComponent() {
						
							this.smallSeqFlag = false; //Flag for small sequence
							this.shapeMaster = {}; //object to store different shapes type created
							this.renderViewModel = undefined;
							this.seqLength = 0;
							this.scaleConfig = undefined; //Actual values will be set in the view render method
							this.xScale = undefined;
							this.line = undefined;
							this.zoom = undefined;
							this.xAxis = undefined;
							this.seqAxis = undefined;
							this.tickCount = dimensions.tickCount;
							this.clipPathId = undefined;
							
							this.initPdbViewer();
					};
					SeqViewerComponent.prototype.initPdbViewer = function () {
						var _this = this;
						scope.overlayText = 'Downloading API Data...';
                        
						//Api call to outlierResidue ratio to get best chain id
						var ratioPromiseList = commonServices.createPromise([scope.entryId], ['observedResidueRatio']);
						commonServices.combinedDataGrabber(ratioPromiseList, scope.entryId, ['observedResidueRatio'], true).then(function(ratioResult) {
								
								//Check if entity id exist
								if(typeof ratioResult[scope.entryId].observedResidueRatio[scope.entityId] !== 'undefined'){
										scope.bestChainId = ratioResult[scope.entryId].observedResidueRatio[scope.entityId][0].chain_id;
										scope.bestStructAsymId = ratioResult[scope.entryId].observedResidueRatio[scope.entityId][0].struct_asym_id;
										
										//If more than 1 chain then show load more link
										if(ratioResult[scope.entryId].observedResidueRatio[scope.entityId].length > 1){
											scope.styles.bottomSection['height'] = dimensions.bottomSecHeigth - dimensions.loadChainsBtnSecHeight+'px';
											scope.showLoadMoreLink = true;
										}
										
										//Combined api call for pdb sequence viewer
										var pdbApiNameList = ['summary','entities','polymerCoveragePerChain','bindingSites','mappings','secStrutures','outliers','modifiedResidues','mutatedResidues','residueListing'];
										var pdbPromiseList = commonServices.createPromise([scope.entryId], pdbApiNameList, scope.bestChainId, scope.bestStructAsymId);
										commonServices.combinedDataGrabber(pdbPromiseList, scope.entryId, pdbApiNameList, true).then(function(result) {
												
												//store outlier and binding sites data for using in load more chains
												scope.outlierApiData = result[scope.entryId].outliers;
												scope.bindingSitesApiData = result[scope.entryId].bindingSites;
												scope.residueListingApiData = result[scope.entryId].residueListing;
												
												scope.overlayText = 'Parsing API Data...';
												//format the api result into component data model
												_this.renderViewModel = $filter('pdbModelFilter')(result, '', '', '', scope.molSeqArr, dimensions.margin.top, scope.entryId, scope.entityId, directiveEle, scope.bestChainId, scope.bestStructAsymId);
												
												_this.initScaleAndZoom(); //initialize d3 scale and zoom
												
												scope.overlayText = 'Rendering View...';
												_this.renderShapes(_this.renderViewModel);
																												
												//Set fit in text
												_this.initFitTextInPath();
												
												//Scale to max zoom if set in options
												if(scope.config.maxZoomed){
														_this.zoom.scale(maxZoom);
														_this.zoomDraw();
												}
												
												scope.overlayText = '';
												
												//Hide View buttons if sequence is small
												if(_this.smallSeqFlag){
														scope.showViewBtn = false;
												}
												scope.$apply();
										
										}, function() {
												scope.overlayText = 'Error downloading API Data!';
												if(window.console){ console.log('Error: PDB veiwer combined api call failed'); }
										});
								
								}else{
										scope.overlayText = 'Error: Entity not found!';
										scope.$apply(); //Apply changes done to the scope variable;
										if(window.console){ console.log('Error: Entity not found!!'); }
								}
								
						}, function() {
								scope.overlayText = 'Error downloading API Data!';
								if(window.console){ console.log('Error: Observed residue ratio api failed'); }
						});
                    
					};
					//Method to initialize d3 scale and zoom after downloading api data
					SeqViewerComponent.prototype.initScaleAndZoom = function () {
						var _this = this;
						scope.overlayText = 'Initalizing scale and zoom...';

						//Set template scope dependency data
						scope.pathLeftLabels = _this.renderViewModel.pathLeftLabels;
						scope.pathMoreLeftLabels = [];
						scope.pdbIdArr = _this.renderViewModel.pdbIdArr;
						scope.entrySummary = _this.renderViewModel.options;
						_this.sequenceArr = scope.entrySummary.seqStr.split('');
						_this.seqLength =  _this.sequenceArr.length

						_this.scaleConfig = {
								indexMax: _this.seqLength - 1,
								minZoom: 1,
								maxZoom: _this.getMaxZoom(_this.seqLength, dimensions.svgScaleWidth)
						}

						//SmallSeqFlag is set true if sequence length is smaller than width 
						//which displays the sequence on load without zoom
						if( _this.seqLength <= Math.ceil(dimensions.tickCount)){
								_this.tickCount = _this.seqLength;
								_this.smallSeqFlag = true;
						}
						
						//Define scale function (x-scale as we only zoom horizontally)
						_this.xScale = d3.scale.linear().domain([0,_this.scaleConfig.indexMax]).range([0,dimensions.svgScaleWidth]);
						
						//Define line function used to get path 'd' value using start and end value
						_this.line = d3.svg.line().x(function(d,i) { return _this.xScale(d[0]); });
						
						//Define top x-axis (numerical)
						_this.xAxis = d3.svg.axis()
										.scale(_this.xScale).orient("top")
										.tickFormat(function(d) { return d + 1; })
										.ticks(_this.tickCount);
						
						//Initialize sequence axis (shown on path as residues)
						_this.seqAxis = d3.svg.axis()
											.scale(_this.xScale).orient("top")
											.tickFormat(function(d) { return _this.sequenceArr[d]; })
											.ticks(_this.tickCount);
							
						//Initialize top axis                   
						var topAxis = svgScaleGroup.select("g.x.axis").call(_this.xAxis);
			
						//Set small sequence flag by comparing top axis tick count 
						if(_this.seqLength === topAxis.selectAll('g.tick')[0].length){
								_this.smallSeqFlag = true;
						}            
						
						//Initialize d3 zoom
						_this.zoom = d3.behavior.zoom().on("zoom", function(){_this.zoomDraw(_this)}).x(_this.xScale).scaleExtent([_this.scaleConfig.minZoom, _this.scaleConfig.maxZoom]);
						
						//Append zoom event
						topSvgDiv.select(".topSvg").call(_this.zoom);
						bottomSvnDiv.select(".shapesGrp").call(_this.zoom);
						
						//Append clip path def to svg which is used to display path only below scale 
						_this.clipPathId = 'clipper_'+Math.floor((Math.random() * 500) + 1);
						svgEle
								.append('defs')
								.append('clipPath')
								.attr('id', _this.clipPathId)
								.append('rect')
										.attr('x', -10)
										.attr('y', -30)
										.attr('width', dimensions.svgWidth)
										.attr('height', 100);
							
					};
					//Method to intialize view rendering after downloading api data
					SeqViewerComponent.prototype.renderShapes = function (seqCompModel) {
						var _this = this;
						
						for(var modelKey in seqCompModel){
	
								if(modelKey === 'groups'){
										
									var totalgroups = seqCompModel[modelKey].length;
									
									for(var grpI = 0; grpI < totalgroups; grpI++){
										
										var grpClass = seqCompModel[modelKey][grpI]['class'];
										var grpParentClass = seqCompModel[modelKey][grpI]['parentGroup'];
										var grpMarginTop = seqCompModel[modelKey][grpI]['marginTop'];
										var grpLabel =  seqCompModel[modelKey][grpI]['label'];
										
										var grpSection = svgMainGroup;
										if(grpParentClass === 'moleculeGrp' || grpClass === 'moleculeGrp'){
												grpSection = svgScaleGroup;
										}
										
										if(grpParentClass !== ''){
												grpSection.select('.'+grpParentClass)
												.append("g").attr("class", grpClass)
												
												if(typeof grpMarginTop != 'undefined' && grpMarginTop){
														grpSection.select('.'+grpClass).attr("transform", "translate(0," + (grpMarginTop) + ")")
												}
										}else{
												grpSection.append("g")
												.attr("class", grpClass)
														.attr("transform", "translate(0," + (dimensions.margin.top + grpMarginTop) + ")")
														.attr('clip-path', 'url(#'+_this.clipPathId+')')
										}
											
									}
										
								}else if(modelKey === 'shapes'){
										
									var totalShapes = seqCompModel[modelKey].length;
									
									for(var shapeI = 0; shapeI < totalShapes; shapeI++){
										var shapeType = seqCompModel[modelKey][shapeI]['shape'];
										var shapeGroupClass = seqCompModel[modelKey][shapeI]['shapeGroupClass'];
										var shapeClass = seqCompModel[modelKey][shapeI]['shapeClass'];
										var shapeContent = seqCompModel[modelKey][shapeI]['shapeContent'];
										var shapeColour = seqCompModel[modelKey][shapeI]['shapeColour'];
										var shapeHeight = seqCompModel[modelKey][shapeI]['shapeHeight'];
										var shapeMarginTop = seqCompModel[modelKey][shapeI]['marginTop'];
										var shapeCap = seqCompModel[modelKey][shapeI]['shapeCap'];
										var shapeShowTooltip = seqCompModel[modelKey][shapeI]['showTooltip'];
										var shapeFitInPath = seqCompModel[modelKey][shapeI]['fitInPath'];
										
										if(typeof shapeHeight === 'undefined'){
												shapeHeight = 0;
										}
										
										if(typeof shapeMarginTop === 'undefined'){
												shapeMarginTop = 0;
										}
										
										if(typeof shapeCap === 'undefined'){
												shapeCap = 'butt';
										}
										
										if(shapeType === 'text'){
												_this.drawText(shapeContent, shapeGroupClass, shapeClass, shapeShowTooltip, shapeFitInPath);
												_this.displaySeq(); //Hide/show seq axis on zoom
										}else if(shapeType === 'zigzag'){
												_this.drawZigzag(shapeContent, shapeGroupClass, shapeClass, shapeColour, shapeHeight, shapeMarginTop, shapeCap, shapeShowTooltip);
										}else if(shapeType === 'arrow'){
												_this.drawArrow(shapeContent, shapeGroupClass, shapeClass, shapeColour, shapeHeight, shapeMarginTop, shapeCap, shapeShowTooltip);
										}else if(shapeType === 'path'){
												_this.drawPath(shapeContent, shapeGroupClass, shapeClass, shapeColour, shapeHeight, shapeMarginTop, shapeCap, shapeShowTooltip);
										}else if(shapeType === 'circle' || shapeType === 'square' || shapeType === 'triangle-up' ||
												shapeType === 'triangle-down' || shapeType === 'diamond' || shapeType === 'cross'){
												_this.createShape(shapeType, shapeContent, shapeGroupClass, shapeClass, shapeColour, shapeShowTooltip, shapeMarginTop)
										}else  if(shapeType === 'sequence'){
												_this.drawSeqAxis(shapeContent, shapeGroupClass,shapeClass, shapeMarginTop, shapeShowTooltip);
												_this.displaySeq(); //Hide/show seq axis on zoom
										}
							
									}
										
								} //else shapes end
						
						}//for end here
							
					};
					//Method to set main/bottom svg height
					SeqViewerComponent.prototype.setMainSvgHeight = function(){
						var heightCorrection = 20;
						svgEle.select('.seqSvgBg').attr('height',20);
						var shapesGrpDims = svgMainGroup.node().getBBox();
						svgEle.attr('height',shapesGrpDims.height + heightCorrection);
						svgEle.select('.seqSvgBg').attr('height',shapesGrpDims.height + heightCorrection);
					};
					//Method to draw text on path
					SeqViewerComponent.prototype.drawText = function(textData, textGroupClass, textClass, textShowTooltip, textFitInPath){
						var _this = this;
						var newText = directiveEle.select('.'+textGroupClass)
								.attr('clip-path', 'url(#'+_this.clipPathId+')')
								.selectAll('path.'+textClass)
								.data(textData)
								.enter()
								.append('text')
										.attr('class', function(d, i) { d.textIndex = i; return 'textEle '+textClass+' '+textClass+'-' + i; })
										.attr('x', function(d){ return _this.xScale(d.textRange[0][0]) })
										.attr('y', function(d){ return d.textRange[1][0] })
										.attr('fill',"white")
										.text(function(d){return d.textString; })
										.style('text-anchor', function(d){
											
												//Attach event on data item
												if(textShowTooltip === true){
													_this.attachMouseEvent(d3.select(this), 'text', 'white', d);
												}
												
												if(typeof d.textAnchor !== 'undefined'){
														return d.textAnchor;
												}else{
														return 'middle';
												}
										})
										.style('font-family', 'Verdana,sans-serif')
										.style('font-size', '12px')
										.style('cursor', 'default')
						
						if(textFitInPath === true){
								_this.fitTextInPath(newText);
								newText.classed('fitTextInPath', true);
								newText.style('display', 'none')
						}
					
					};
					//Method to fit text into path width
					SeqViewerComponent.prototype.fitTextInPath = function(textSelector){
							var _this = this;
							textSelector.each(function(d){
								var textElement = d3.select(this);
								var textEleData = textElement.data()[0];
								var correspondingPathWidth = directiveEle.select('.'+textEleData.pathClassPrefix+'-'+textEleData.textIndex).node().getBBox().width;
													_this.textFontResize(textElement, correspondingPathWidth)
							});
					}
					//Recursive function to fit text into path width
					SeqViewerComponent.prototype.textFontResize = function(textElement, pathWidth){
							var _this = this;
							var currentTextBoxWidth = textElement.node().getBBox().width;
							if(currentTextBoxWidth > pathWidth){
									var currentFontSize = parseInt(textElement.style('font-size'));
									if(currentFontSize > 2){
											textElement.style('font-size', (currentFontSize - 2) + 'px');
											_this.textFontResize(textElement, pathWidth); //recursively call the medthod until text fits in the path width
									}else{
											textElement.style('font-size', '0px');
									}
							}
					};
					//Method to draw zigzag on path
					SeqViewerComponent.prototype.drawZigzag = function(pathData, pathGroupClass, pathClass, pathColor, pathHeight, pathMarginTop, pathCap, pathShowTooltip){
						var _this = this;
							directiveEle.select('.'+pathGroupClass)
									.attr('clip-path', 'url(#'+_this.clipPathId+')')
									.selectAll('path.'+pathClass)
									.data(pathData)
									.enter()
									.append('path')
									.attr('class', function(d, i) { return 'linkerPathEle '+pathClass+'-' + i; })
									.attr('stroke', function(d) { return d3.rgb(d.color[0],d.color[1],d.color[2]).brighter(); })
									.attr('stroke-width',2)
									.attr('stroke-linecap', pathCap)
									.attr('fill', function(d) { return d3.rgb(d.color[0],d.color[1],d.color[2]).brighter(); })
									.attr("transform", "translate(0,-9)")
									.attr('d', function(d){
											
											if(pathShowTooltip == true){
													var rgbColor = d3.rgb(d.color[0],d.color[1],d.color[2]).brighter();
													_this.attachMouseEvent(d3.select(this), 'path', rgbColor, d);
											}
											
											var dNewVal = _this.getZigZagdVal(_this.xScale(d.pathStart), d.pathPosition);
											return dNewVal;
									});
							
					};
					//Method to get zigzag path d value
					SeqViewerComponent.prototype.getZigZagdVal = function(startPoint, pathPosition){
					  
					  var prefixArr = ['M','0L','0L','3L','6L','9L','12L', '15L', '18L'];
					  var addFlag = 0;
					  var dNewVal = '';
					  var diffRange = 5;
					  
					  if(pathPosition === 'start'){
						diffRange = -5;
					  }
					  
					  angular.forEach(prefixArr, function(prefixVal, index) {
						var dPushVal = 0;
						if(addFlag === 0){
						  addFlag = 1;
						  dPushVal = startPoint;
						}else{
						  addFlag = 0;
						  dPushVal = startPoint + diffRange;
						}
						dNewVal += prefixVal+''+dPushVal+','; 
					  });
					  
					  dNewVal += '18 Z';
					  
					  return dNewVal;
					};
					//Method to draw different d3 path shapes
					SeqViewerComponent.prototype.createShape = function(shapeType, shapeData, shapeGroupClass, shapeClass, shapeColor, shapeShowTooltip, shapeMarginTop){
						var _this = this;
						_this.shapeMaster[shapeClass] = shapeType;
		
						directiveEle.select('.'+shapeGroupClass)
						.attr('clip-path', 'url(#'+_this.clipPathId+')')
						.selectAll('otherPathShape path.'+shapeClass)
						.data(shapeData)
						.enter()
							.append('path')
							.attr('class', shapeClass)
							.attr('d', _this.getShapeDVal(shapeType))
							.attr('fill', function(d){
								var shapeFillColor;
								if(typeof d.color !== 'undefined'){
									shapeFillColor = d3.rgb(d.color[0],d.color[1],d.color[2]).brighter();	
								}else{ 
									shapeFillColor = shapeColor;
								}
								
								//Attach events
								if(shapeShowTooltip == true){
									_this.attachMouseEvent(d3.select(this), 'circle', shapeFillColor, d);
								}
								
								return shapeFillColor;
							})
							.attr('stroke','none')
							.attr('stroke-width',0)
							.attr('transform',function(d,i){
								var translateStr = "translate("+(_this.xScale(d.residue_number - 1))+","+(10)+")"; 
								if(shapeMarginTop !== 0){
									translateStr = "translate("+(_this.xScale(d.residue_number - 1))+","+(shapeMarginTop)+")"; 
								}
								return translateStr;
							});
				  
					};
					//Method to get shape path d value
					SeqViewerComponent.prototype.getShapeDVal = function(shapeType){
						var _this = this;
						return d3.svg.symbol().type(shapeType)
								.size(function(d){ return _this.smallSeqFlag ? 40 : _this.getShapeSize(_this.zoom.scale()) * 10 });
					};
					//Method to get shape size value
					SeqViewerComponent.prototype.getShapeSize = function(shapeSize){
							if(shapeSize < 1.7){
									shapeSize = 1.7;
							}else if(shapeSize > 4.5){
									shapeSize = 4.5;
							}
							return shapeSize;
					};
					//Method to draw Seq axis shown as residues on path
					SeqViewerComponent.prototype.drawSeqAxis = function(shapeContent, seqGrpClass, seqClass, seqMarginTop, seqShowTooltip){
						var _this = this;
						//Add group
						directiveEle.select('.'+seqGrpClass).append("g").attr("class", "seqAxis "+seqClass);
						
						var axisEle = directiveEle.select("."+seqClass);
						
						//Add axis
						axisEle.call(_this.seqAxis);
						
						if(seqMarginTop && typeof seqMarginTop != 'undefined'){
							axisEle.attr("transform", "translate(0," + (seqMarginTop) + ")");
						}
						
						//attach events
						if(seqShowTooltip == true){
							select 
							_this.attachMouseEvent(axisEle, 'text', 'white', shapeContent);
						}
						
					};
					//Method to draw path
					SeqViewerComponent.prototype.drawPath = function(pathData, pathGroupClass, pathClass, pathColor, pathHeight, pathMarginTop, pathCap, pathShowTooltip){
						var _this = this;
						directiveEle.select('.'+pathGroupClass)
								.attr('clip-path', 'url(#'+_this.clipPathId+')')
								.selectAll('path.'+pathClass)
								.data(pathData)
								.enter()
								.append('path')
										.attr('class', function(d, i) { return 'pathEle '+pathClass+'-' + i; })
										.attr('stroke', function(d){
												var thisPathColor;
												if(typeof d.color !== 'undefined'){
														var rgbColor = d3.rgb(d.color[0],d.color[1],d.color[2]).brighter();
														thisPathColor = rgbColor;
												}else{
														thisPathColor = pathColor;
												}
												
												//attach events
												if(pathShowTooltip == true){
													_this.attachMouseEvent(d3.select(this), 'path', thisPathColor, d);
												}
												return thisPathColor;
										})
										.attr('stroke-width',pathHeight)
										.attr('stroke-opacity', function(d){
												if(typeof d.opacity !== 'undefined'){
														return d.opacity;
												}else{
														return 1;
												}
										})
										.attr('stroke-linecap', pathCap)
										.attr('fill', 'none')
										.attr("transform", "translate(0," + pathMarginTop + ")")
										.attr('d', function(d){ return _this.line(d.pathRange)});
					};
					//Method to draw arrow (secondary structure)
					SeqViewerComponent.prototype.drawArrow = function(pathData, pathGroupClass, pathClass, pathColor, pathHeight, pathMarginTop, pathCap, pathShowTooltip){
						var _this = this;
						directiveEle.select('.'+pathGroupClass)
								.attr('clip-path', 'url(#'+_this.clipPathId+')')
								.selectAll('path.'+pathClass)
								.data(pathData)
								.enter()
								.append('path')
										.attr('class', function(d, i) { return 'arrowEle '+pathClass+'-' + i; })
										.attr('stroke', function(d) {
												var arrowColor = d3.rgb(d.color[0],d.color[1],d.color[2]).brighter();
												//bind event
												if(pathShowTooltip == true){
														_this.attachMouseEvent(d3.select(this), 'arrow', arrowColor, d);
												}
												
												return arrowColor; 
										})
										.attr('stroke-width',pathHeight)
										.attr('stroke-linecap', pathCap)
										.attr('fill', function(d) { return d3.rgb(d.color[0],d.color[1],d.color[2]).brighter(); })
										.attr("transform", "translate(0," + pathMarginTop + ")")
										.attr('d', function(d){ return _this.getArrowDVal(_this.line(d.pathRange)); });
                    
					};
					//Method to draw arrow d value
					SeqViewerComponent.prototype.getArrowDVal = function(oldDVale){
						var dValArr = oldDVale.split(',');
						var startNum = parseFloat(dValArr[0].substring(1));
						var endNum = parseFloat(dValArr[1].substring(2));
						
						var pathLength = (endNum - startNum) + 1;
						var diffVal = 5;
						if(pathLength < 10){
								diffVal = pathLength - 2;
						}
						
						var newdStr = 'M'+startNum+',-5'+
														'L'+(endNum - diffVal)+',-5'+
														'L'+(endNum - diffVal)+',-10'+
														'L'+endNum+',0'+
														'L'+(endNum - diffVal)+',10'+
														'L'+(endNum - diffVal)+',5'+
														'L'+startNum+',5'
						
						return newdStr;
					};
					//Method to calculate Max zoom (limit) to stop zooming when residues are shown on the path
					SeqViewerComponent.prototype.getMaxZoom = function(seqLength, width){	
						var _this = this;
						//This calculation formula is derived from observed zoom values
						var maxZoom = 0;
						if(width % 100 === 0){
							maxZoom = (0.2112 * seqLength) / _this.getZoomDivisor(width);
						}else{
							var floorVal = Math.floor(width/100)*100;
							if(floorVal < 1)floorVal = 100;
							var floorZoomVal = (0.2112 * seqLength) / _this.getZoomDivisor(floorVal);
							var zoomMatrix = {
									100 : {diff: 2, range: [1,2,4,7,9]},
									200 : {diff: 1.5, range: [2,5]},
									300 : {diff: 0.9, range: [4,9]},
									400 : {diff: 0.7, range: [5,9]},
									500 : {diff: 0.6, range: [1,9]},
									600 : {diff:0.45, range: [8,9]},
									700 : {diff:0.4, range: [8,9]}
							}

							if(width < 800){

									var rangeLength = zoomMatrix[floorVal]['range'].length;
									for(var rangeIndex = rangeLength - 1; rangeIndex >= 0; rangeIndex--){
											if(width >= floorVal + (zoomMatrix[floorVal]['range'][rangeIndex] * 10)){
													if(rangeIndex === 0){
															maxZoom = floorZoomVal;
													}else{
															maxZoom = floorZoomVal - ((((zoomMatrix[floorVal]['diff']) / 100) * seqLength)  * rangeIndex);
													}
													break;
											}

									}
							}else{
									maxZoom = (0.2112 * seqLength) / _this.getZoomDivisor(floorVal);
							}

						}

						if(maxZoom === 0){
								maxZoom = floorZoomVal;
						}

						return maxZoom;
					};
					SeqViewerComponent.prototype.getZoomDivisor = function (num){
						//This calculation formula is derived from observed zoom values
						var divisor = 1;
						if(num > 100){
								divisor = Math.floor(Math.floor(num) / 100)
						}
						return divisor;
					};
					//Method to hide/show sequence on path depending on zoom
					SeqViewerComponent.prototype.displaySeq = function(){
						var _this = this;
						if(_this.smallSeqFlag || _this.zoom.scale() === _this.scaleConfig.maxZoom){
								
							directiveEle.selectAll('.linkerPathEle')
									.attr('d', function(d){
											var newStartVal = 0;
											if(d.pathPosition === 'start'){
													newStartVal = d.pathStart - 0.1;
											}else{
													newStartVal = d.pathStart + 0.1;
											}
											var dNewVal = _this.getZigZagdVal(_this.xScale(newStartVal), d.pathPosition);
											return dNewVal;
									});
							
							directiveEle.selectAll('.seqPath')
									.attr('d', function(d){
											var lineStr = _this.line(d.pathRange); //normal return value
											var lineArr = lineStr.split(',');
											lineArr[0] = 'M' + (parseFloat(lineArr[0].substring(1)) - 5);
											lineArr[1] = '0L' + (parseFloat(lineArr[1].substring(2)) + 5);
											return lineArr.join(',');
									});
							
							directiveEle.selectAll('.nonSeqPath')
									.attr('d', function(d){
											var lineStr = _this.line(d.pathRange); //normal return value
											var lineArr = lineStr.split(',');
											if(parseFloat(lineArr[0].substring(1)) > 0){
											lineArr[0] = 'M' + (parseFloat(lineArr[0].substring(1)) + 5);
											}
											lineArr[1] = '0L' + (parseFloat(lineArr[1].substring(2)) - 5);
											return lineArr.join(',');
									})
							
							//Reset path lines (unipdb)
							var linePathEle = directiveEle.selectAll('.linePathEle');
							linePathEle.each(function(d){
									d3.select(d3.select(this).node())
											.attr('d', function(d){
													var lineStr = _this.line(d.pathRange);
													var lineArr = lineStr.split(',');
													var firstPoint = parseFloat(lineArr[0].substring(1)) + 5;
													var lineArrLen = lineArr.length;
													lineArr[0] = 'M' + firstPoint;
													var lastPoint = parseFloat(lineArr[lineArrLen - 2].substring(2)) - 5;
													lineArr[lineArrLen - 2] = '5L' + lastPoint;
													
													return lineArr.join(',')
											});
							});
							
							directiveEle.selectAll(".seqAxis").style('display','block');
							directiveEle.selectAll(".hideTextOnZoom").style('display','none');
							directiveEle.selectAll(".showTextOnZoom").style('display','block');
						}else{
							directiveEle.selectAll(".seqAxis").style('display','none');
							directiveEle.selectAll(".hideTextOnZoom").style('display','block');
							directiveEle.selectAll(".showTextOnZoom").style('display','none');
						}
				
					};
					//Method to resize on zoom
					SeqViewerComponent.prototype.zoomDraw = function() {
						var _this = this;
						//Show horizontal scroll icons if zoom > 1 
						if(_this.zoom.scale() > 1){
								directiveEle.selectAll('.SeqScrollArrow').style('display','block');
						}else{
								directiveEle.selectAll('.SeqScrollArrow').style('display','none');
						}
						
						//Disable zoom if expanded
						if(scope.allowZoom === false){
							_this.zoom.scale(_this.scaleConfig.maxZoom);
						}
						
						//Set the Min-Max for the pan scroll
						var trans = _this.zoom.translate(), scale = _this.zoom.scale(),
						tx = Math.min(0, Math.max(dimensions.svgScaleWidth * (1 - scale), trans[0])),
						ty = Math.min(0, Math.max(1 * (1 - scale), trans[1]));
						_this.zoom.translate([tx, ty]);
						
						//Reset x axis
						svgScaleGroup.select("g.x.axis").call(_this.xAxis);
						
						//Reset paths
						directiveEle.selectAll('.pathEle').each(function(d){
							d3.select(this).attr('d', _this.line (d.pathRange));
						});
						
						//Resent secondary structure strands
						directiveEle.selectAll('.arrowEle').each(function(d){
							d3.select(this).attr('d', _this.getArrowDVal(_this.line(d.pathRange)));
						});
						
						//Reset linker paths
						directiveEle.selectAll('.linkerPathEle').each(function(d){
								var dNewVal = _this.getZigZagdVal(_this.xScale(d.pathStart), d.pathPosition);
								d3.select(d3.select(this).node()).attr('d', dNewVal);
						});
						
						//Reset the sequence axis
						directiveEle.selectAll(".seqAxis").call(_this.seqAxis);
						
						//Reset custom shapes
						for(var shapeClass in _this.shapeMaster){
							directiveEle.selectAll('.'+ shapeClass)
									.attr('d', _this.getShapeDVal(_this.shapeMaster[shapeClass]))
									.attr('transform',function(d,i){ 
									var translateStr = "translate("+(_this.xScale(d.residue_number - 1))+","+(10)+")"; 
											if(typeof d.marginTop != 'undefined' && d.marginTop !== 0){
													translateStr = "translate("+(_this.xScale(d.residue_number - 1))+","+(d.marginTop)+")"; 
											}
											return translateStr;
									});
						}
						
						_this.displaySeq(); //Hide/show seq axis on zoom
						
						//Reset text on the Path elements
						directiveEle.selectAll('.textEle').each(function(d){
							var textEle = d3.select(this);
							var textEleData = textEle.data()[0];
							textEle.attr('x', function(d){ return _this.xScale(d.textRange[0][0]) });
							
							//Set the font size for fit in path option
							if(typeof textEleData !== 'undefined' && typeof textEleData.fitInPath !== 'undefined' && textEleData.fitInPath === true){
									textEle.style('font-size','12px');
									_this.fitTextInPath(textEle);
							}
						});
						
					};
					//Method to fit in method
					SeqViewerComponent.prototype.initFitTextInPath = function(){
						var _this = this;
						directiveEle.selectAll('.fitTextInPath').each(function(d){
								var textEle = d3.select(this);
								var textEleData = textEle.data()[0];
								textEle.style('display','block');
								
								textEle
								.attr('x', function(d){ return _this.xScale(d.textRange[0][0]) });
								
								//Set the font size for fit in path option
								if(typeof textEleData !== 'undefined' && typeof textEleData.fitInPath !== 'undefined' && textEleData.fitInPath === true){
									//textEle.style('font-size','12px');
									_this.fitTextInPath(textEle);
								}
						});
					}
					//Method to show tooltip
					SeqViewerComponent.prototype.showTooltip = function(tooltipMsg, elementType, e){
						var y = 0, x = 0;
						
						//Event type is used to know the elementType of mouse event d3/ng
						if(elementType === 'ng'){
								x = e.pageX;
								y = e.pageY;
						} else {
								x = d3.event.pageX;
								y = d3.event.pageY;
						}
						
						toolTipEle.html(tooltipMsg).style('display','block').style('top', y + 15 +'px').style('left', x + 10 +'px');
					};
					//Method to hide tooltip
					SeqViewerComponent.prototype.hideTooltip = function(){
						toolTipEle.style('display','none');
					};
					//Method to get Residue details from scale coordinates for tooltip
					SeqViewerComponent.prototype.getResidue = function(coordinates, eleType){
						var _this = this;                    
						var residueIndex = coordinates[0];
						if(eleType !== 'circle'){
								residueIndex = Math.round(_this.xScale.invert(coordinates[0]));
						}
						return 'Residue ' + (residueIndex + 1) + ' (' + _this.sequenceArr[residueIndex] + ')';
					};
					//Method to dispatch custom events
					SeqViewerComponent.prototype.dispatchEvent = function (eventType, eventData, eventElement) {
						var dispatchEventElement = element[0];
						if(typeof eventElement !== 'undefined'){
							dispatchEventElement = eventElement;
						}
						if(typeof eventData !== 'undefined'){
							scope.pdbevents[eventType]['eventData'] = eventData;
						}
						dispatchEventElement.dispatchEvent(scope.pdbevents[eventType])
					};
					//Method to perform event operations
					SeqViewerComponent.prototype.eventOperations = function(eventType, eleObject, eleType, pathColor, mouseCordinates, eleData){
						var _this = this;
						var toolTipContent;
						var tooltipPosition;
						
						if(typeof eleData !== 'undefined'){
							toolTipContent = eleData.tooltipMsg;
							tooltipPosition = eleData.tooltipPosition;
						}
						
						//For shapes other than path
						if(eleType === 'circle'){
							mouseCordinates[0] = eleData.residue_number - 1;
						}
						
						var residueDetails = _this.getResidue(mouseCordinates, eleType);
						if(angular.isUndefined(toolTipContent)){
							toolTipContent = residueDetails;
						}else {
							if(!angular.isUndefined(tooltipPosition) && tooltipPosition === 'prefix'){
									toolTipContent = toolTipContent+' '+residueDetails;
							}else if(!angular.isUndefined(tooltipPosition) && tooltipPosition === 'postfix'){
									toolTipContent = residueDetails+' '+toolTipContent;
							}
						}
						
						/*if(eleType === 'path' || eleType === 'circle'){
							eleObject.attr('stroke', pathColor.brighter());
						}else if(eleType === 'arrow'){
							eleObject.attr('stroke', pathColor.brighter()).attr('fill', pathColor.brighter());
						}*/
						
						//show tooltip
						if(eventType == 'PDB.seqViewer.mouseover'){
							_this.showTooltip(toolTipContent, 'd3', mouseCordinates);
						}
						
						//Dispatch custom click event
						_this.dispatchEvent(eventType, {
							viewerType: 'pdbViewer',
							elementData : eleData,
							residueNumber : parseInt(residueDetails.split(' ')[1]),
							entryId: scope.entryId,
							entityId: scope.entityId
						});
					};
					//Method to attach mouse events
					SeqViewerComponent.prototype.attachMouseEvent = function(eleObject, eleType, pathColor, eleData){
							var _this = this;
							eleObject.on('click', function(){
								var mouseCordinates = d3.mouse(this);
								_this.eventOperations('PDB.seqViewer.click', eleObject, eleType, pathColor, mouseCordinates, eleData);
								return;
								
							}).on('mouseover', function(){
								var mouseCordinates = d3.mouse(this);
								_this.eventOperations('PDB.seqViewer.mouseover',eleObject, eleType, pathColor, mouseCordinates, eleData);
								return;
								
							})
							.on('mousemove', function(){
								var mouseCordinates = d3.mouse(this);
								_this.eventOperations('PDB.seqViewer.mouseover', eleObject, eleType, pathColor, mouseCordinates, eleData);
								return;
								
							})
							.on('mouseleave', function(){
								
								/*if(eleType === 'path'){
										d3.select(this).attr('stroke', pathColor.darker().brighter())
								}else if(eleType === 'arrow'){
										d3.select(this)
										.attr('stroke', pathColor.darker().brighter())
										.attr('fill', pathColor.darker().brighter());
								}*/
								_this.hideTooltip();
								
								//Dispatch custom mouseout event
								_this.dispatchEvent('PDB.seqViewer.mouseout', {
									viewerType: 'pdbViewer',
									entryId: scope.entryId,
									entityId: scope.entityId
								});
							
							});
					}
                
					return SeqViewerComponent;
					
			})(); //SeqViewerComponent() end here
            
			//Instantiate LiteMolApp
			var seqViewerApp = new SeqViewerComponent();
            
			//Methods in scope for template level operations
			
			//Watch View button to change view
			scope.$watch('activeViewBtn', function() {
				if(typeof seqViewerApp.zoom === 'undefined') return;
				if(scope.activeViewBtn === 'expanded'){
						seqViewerApp.zoom.scale(seqViewerApp.scaleConfig.maxZoom);
						seqViewerApp.zoomDraw();
						scope.allowZoom = false;
				}else{
						seqViewerApp.zoom.scale(1);
						scope.allowZoom = true;
						seqViewerApp.zoomDraw();
				}
			});
            
			//Pan Left/Right
			var ArrowPromise;
			scope.movePan = function(size){
				var t = seqViewerApp.zoom.translate();
				seqViewerApp.zoom.translate([t[0] + size, t[1]]);
				seqViewerApp.zoomDraw();
				
				ArrowPromise = $interval(function () {
						var t1 = seqViewerApp.zoom.translate();
						seqViewerApp.zoom.translate([t1[0] + size, t1[1]]);
						seqViewerApp.zoomDraw();
				}, 100);
			}
			
			scope.stopMovingPan = function(size){
				$interval.cancel(ArrowPromise);
			}
            
			//Function to load more chains entire polymer coverage api data
			scope.loadMoreChains = function(){
				scope.showLoadMoreLink = false;
				
				//show loading message
				wapperDiv.append('div')
						.classed('smallOverlayChains', true)
						.text('Loading Chain API Data..')
						.attr('style', dimensions.seqViewerSmallOverlay)
				
				var ratioPromiseList = commonServices.createPromise([scope.entryId], ['polymerCoverage']);
				commonServices.combinedDataGrabber(ratioPromiseList, scope.entryId, ['polymerCoverage'], true).then(function(polymerResult) {
						
					var chainsDataModel = $filter('pdbModelFilter')(polymerResult, scope.outlierApiData, scope.bindingSitesApiData, scope.residueListingApiData, scope.molSeqArr, dimensions.margin.top, scope.entryId, scope.entityId, directiveEle, scope.bestChainId, scope.bestStructAsymId);
					
					seqViewerApp.renderShapes(chainsDataModel);
					
					//seqViewerApp.zoomDraw();
					scope.pathMoreLeftLabels = scope.pathMoreLeftLabels.concat(chainsDataModel.pathLeftLabels); //Add the new chain labels
					scope.chainsViewStatus = 'fewer';
					scope.chiansHideShowBtn = true;
					scope.$apply(); //Apply changes done to the scope variable;
					
					//set svg height
					seqViewerApp.setMainSvgHeight();
					wapperDiv.selectAll('.smallOverlayChains').remove();
				}, function() {
					wapperDiv.selectAll('.smallOverlayChains').remove();
					if(window.console){ console.log('load more chains api failed'); }
				});
			
			}
			
			//Function to hide/show more chains
			scope.hideShowChainsFn = function(){
				if(scope.chainsViewStatus == 'fewer'){
						scope.chainsViewStatus = 'more';
						svgEle.selectAll('.otherChainPaths').style('display','none');
						directiveEle.selectAll('.moreChainLabels').style('display','none');
				}else{
						scope.chainsViewStatus = 'fewer'
						svgEle.selectAll('.otherChainPaths').style('display','block');
						directiveEle.selectAll('.moreChainLabels').style('display','block');
				}
				
				//set svg height
				seqViewerApp.setMainSvgHeight();
			}
			
			//Tooltip hide/show methods in scope for template level binding
			scope.showTooltip = function(tooltipMsg, elementType, e){
				seqViewerApp.showTooltip(tooltipMsg, elementType, e);
			}
			
			scope.hideTooltip = function(){
				seqViewerApp.hideTooltip();
			}
			
			//bind/listen to other library compoenent events
			if(scope.subscribeEvents == 'true'){
				$document.on('PDB.topologyViewer.click', function(e){
					if(typeof e.eventData !== 'undefined'){
						//Abort if entryid and entityid do not match or viewer type is unipdb
						if(e.eventData.entryId != scope.entryId || e.eventData.entityId != scope.entityId) return;								
						//Abort if chain id is different
						if(e.eventData.chainId != scope.bestChainId)return;
						
						//Remove previous highlight
						directiveEle.selectAll('.selectionPath').remove();
						
						var highlightResideDataModel = $filter('highlightResideShapeFilter')(e.eventData, 'click');
						seqViewerApp.renderShapes(highlightResideDataModel);
						
					}
				});
			
				$document.on('PDB.topologyViewer.mouseover', function(e){
					if(typeof e.eventData !== 'undefined'){
						//Abort if entryid and entityid do not match or viewer type is unipdb
						if(e.eventData.entryId != scope.entryId || e.eventData.entityId != scope.entityId) return;								
						//Abort if chain id is different
						if(e.eventData.chainId != scope.bestChainId)return;
						
						//Remove previous highlight
						directiveEle.selectAll('.highlightPath').remove();
						
						var highlightResideDataModel = $filter('highlightResideShapeFilter')(e.eventData, 'mouseover');
						seqViewerApp.renderShapes(highlightResideDataModel);
						
					}
				});
				
				$document.on('PDB.topologyViewer.mouseout', function(e){
					//Remove highlight
					directiveEle.selectAll('.highlightPath').remove();
				});
				
				$document.on('PDB.litemol.mouseover', function(e){
					if(typeof e.eventData !== 'undefined' && !angular.equals({}, e.eventData)){
						
						//Abort if entryid and entityid do not match or viewer type is unipdb
						if(e.eventData.entryId.toLowerCase() != scope.entryId.toLowerCase() || e.eventData.entityId != scope.entityId) return;								
														
						//Remove previous highlight
						directiveEle.selectAll('.highlightPath').remove();
						
						var highlightResideDataModel = $filter('highlightResideShapeFilter')(e.eventData, 'mouseover');
						seqViewerApp.renderShapes(highlightResideDataModel);
						
					}else{
						//Remove highlight
						directiveEle.selectAll('.highlightPath').remove();
					}
				});
				
				$document.on('PDB.litemol.click', function(e){
					if(typeof e.eventData !== 'undefined' && !angular.equals({}, e.eventData)){
						
						//Abort if entryid and entityid do not match or viewer type is unipdb
						if(e.eventData.entryId.toLowerCase() != scope.entryId.toLowerCase() || e.eventData.entityId != scope.entityId) return;								
														
						//Remove previous highlight
						directiveEle.selectAll('.selectionPath').remove();
						
						var highlightResideDataModel = $filter('highlightResideShapeFilter')(e.eventData, 'click');
						seqViewerApp.renderShapes(highlightResideDataModel);
					
					}
				});
			}
                        
			
		} //link Fn End
		  
	  }
	}]);
  
  
}());