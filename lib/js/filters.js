;(function () {

  'use strict';
  
  angular.module('pdb.sequence.view.filters', ['d3Core','pdb.sequence.view.services','pdb.common.services'])
	.filter('modifiedResFilter', ['commonServices', function(commonServices){ //Mutation and modified residues filter (created separate filter to be used for both viewer types)
		return function(apiData, pathData, dataPdbId, shapeHeight, shapeMarginTop, textMarginTop, apiName, viewerType){
		  
		  var modDataModel = [];
	  
		  var checkResidueInRange = function(eleDataObj, residueApiData){
			
			var resDetails = {
			  residueNum: residueApiData.residue_number,
			  chainId: residueApiData.chain_id,
			  entityId: residueApiData.entity_id,
              structAsymId: residueApiData.struct_asym_id
			}
			
			var residueIndex = -1;
			angular.forEach(eleDataObj, function(eleData, dataIndex) {
			  var pathDetails = {
				pdbStart: eleData.pathData.start.residue_number,
				pdbEnd: eleData.pathData.end.residue_number,
				unpStart: eleData.pathRange[0][0] + 1,
				unpEnd: eleData.pathRange[1][0] + 1,
				chainId: eleData.pathData.chain_id,
				entityId: eleData.pathData.entity_id,
                structAsymId: eleData.pathData.struct_asym_id
			  }
			  
			  /*if(resDetails.residueNum >= pathDetails.pdbStart  
			  && resDetails.residueNum <= pathDetails.pdbEnd 
			  && resDetails.chainId <= pathDetails.chainId 
			  && resDetails.entityId <= pathDetails.entityId ){
				residueIndex = resDetails.residueNum - (pathDetails.pdbStart - pathDetails.unpStart);
			  }*/
              if(resDetails.residueNum >= pathDetails.pdbStart  
			  && resDetails.residueNum <= pathDetails.pdbEnd 
			  && resDetails.structAsymId <= pathDetails.structAsymId 
			  && resDetails.entityId <= pathDetails.entityId ){
				residueIndex = resDetails.residueNum - (pathDetails.pdbStart - pathDetails.unpStart);
			  }
			});
			
			return residueIndex;
		  }
		  
		  var shapeObj = {
					shape : 'path',
					shapeGroupClass : 'mutationGrp_'+dataPdbId,
					shapeClass : 'mutation_'+dataPdbId,
					shapeHeight : shapeHeight,
					marginTop : shapeMarginTop,
					showTooltip: true,
					shapeContent : []
				}
				
				//Text shape object for mutation text on top of mutation area
				var textObj = {
					shape : 'text',
					shapeGroupClass : 'mutationGrp_'+dataPdbId,
					shapeClass : 'showTextOnZoom singleTextEle mutation_text_'+dataPdbId,
					shapeHeight : shapeHeight,
					marginTop : shapeMarginTop,
					showTooltip: true,
					shapeContent : []
				}
			
				angular.forEach(apiData, function(apiDataDetails, dataIndex) {
					
					var mutResIndex = apiDataDetails.residue_number;
					if(viewerType === 'unipdbe'){
					  mutResIndex = checkResidueInRange(pathData, apiDataDetails);
					}else{
					  if(apiDataDetails.entity_id != pathData.entityId){
						return;
					  }
					}
				  
				  var tooltipMsg = '';
				  var mutTextData = '';
				  
					if(typeof apiDataDetails.mutation_details !== 'undefined' && apiName === 'mutatedResidues'){ 
					  if(apiDataDetails.mutation_details.from !== null){
					  tooltipMsg += apiDataDetails.mutation_details.from+' --> ';
					}
					  tooltipMsg += apiDataDetails.mutation_details.to+' ('+apiDataDetails.mutation_details.type+')';
					
					  mutTextData = apiDataDetails.mutation_details.to;
					  
					}else{
					  tooltipMsg = 'Modified Residue: '+apiDataDetails.chem_comp_id;
					  mutTextData = '';
					}
				  
				  if(mutResIndex > -1){
					//mutation path range
					shapeObj.shapeContent.push(
					  {
						pathRange : [[mutResIndex - 1 - 0.5,0],[mutResIndex - 1 + 0.5,0]],
						tooltipMsg: tooltipMsg,
						pathData  : apiDataDetails,
						color : commonServices.specificColors.burntOrange
					  }
					);
					
					//mutation text range
					textObj.shapeContent.push(
					  {
						textRange : [[mutResIndex - 1,0],[textMarginTop,0]],
						tooltipMsg: tooltipMsg,
						textString  : mutTextData,
						pathData  : apiDataDetails,
						color : commonServices.specificColors.burntOrange
					  }
					);
				  }
			  });
				
				if(shapeObj.shapeContent.length > 0){
			modDataModel.push(shapeObj);
				}
				
				if(textObj.shapeContent.length > 0){
			modDataModel.push(textObj);
				}
		  
		  return modDataModel;
		}
		
	}])
	  
	.filter('highlightResideShapeFilter', [function(){  //chain residue highlight shape model 
		return function(eventData, eventType){
			var shapeClass = 'highlightPath highlightPath';
			var showTooltip = false;
			if(eventType == 'click'){
				shapeClass = 'selectionPath selectionPath';
				showTooltip = true;
			}
			var highlightShapeObj = {
				shape : 'path',
				shapeGroupClass : 'chain'+eventData.chainId+'PathGrp'+eventData.entryId.toLowerCase(),
				shapeClass : shapeClass,
				shapeHeight : 25,
				marginTop : 0,
				showTooltip: showTooltip,
				shapeContent : [{
					pathRange : [[eventData.residueNumber - 1 - 0.5,0],[eventData.residueNumber - 1 + 0.5,0]],
					//tooltipMsg: textObjTooltip,
					//tooltipPosition: 'postfix',
					elementType: 'ResidueSelection',
					pathData: eventData,
					color: [0,0,0],
					//color: [255,247,0],
					opacity: 0.5
				}]
			}
			
		  return { shapes: [highlightShapeObj] };
		}
		
	}])
	  
	.filter('pdbModelFilter', ['$filter', 'seqViewerService', 'commonServices', function($filter, seqViewerService, commonServices){ //Pdb model filter
		return function(respData, outlierApiData, bindingSitesApiData, residueListingApiData, sequenceArr, marginTop, pdbId, entityId, parentEle, bestChainId, bestStructAsymId){
		  
		  //Function to get current entity from entities api result array
		  var getCurrentEntityDetails = function(entityArr, entityId){
			var totalEntities = entityArr.length;
			for(var i=0; i < totalEntities; i++){
			  if(entityArr[i].entity_id == entityId){
				return entityArr[i];
			  }
			}
		  } //getCurrentEntityDetails()
		  
		  //Function to get uniprot mappings
		  var getMappingsShapeObj = function(MappingsApiArr, entityId, type, colorArr, bestStructAsymId){
			  
			var mappingResult = {
			  idArr : [pdbId],
			  unpShapeObj : {
				shape : 'path',
				shapeGroupClass : type+'PathGrp'+pdbId,
				shapeClass : 'seqPath '+type+'Path'+pdbId+' '+type+'Path'+pdbId,
				shapeHeight : 15,
				showTooltip: true,
				shapeContent : []
			  },
			  mappingTextObj : {
				shape : 'text',
				shapeGroupClass : type+'PathGrp'+pdbId,
				shapeClass : type+'_text',
				shapeHeight : 15,
				marginTop : 2,
				showTooltip: true,
				shapeContent : [],
				fitInPath: true
			  }
			}
			
			var totalColors = colorArr.length;
			var tempRangeObj = {};
			var tempTextObj = {};
			var pathColorIndex = 0;
			angular.forEach(MappingsApiArr, function(mappingsDetails, entryId){
			  angular.forEach(mappingsDetails.mappings, function(mappingsData, mappingIndex){
				if(mappingsData.entity_id == entityId){
				  
				  //check chain id for cath and scop
				  if(type === 'cath' || type === 'scop'){
					if(mappingsData.struct_asym_id != bestStructAsymId){
					  return;
					}  
				  }
				
				  var rangObjKey = mappingsData.start.residue_number+'-'+mappingsData.end.residue_number;
				 
				  if(rangObjKey in tempRangeObj){
					
					//change 'chain' to 'chains'
					tempRangeObj[rangObjKey].tooltipMsg = tempRangeObj[rangObjKey].tooltipMsg.replace("(chain ", "(chains ");
					tempTextObj[rangObjKey].tooltipMsg = tempRangeObj[rangObjKey].tooltipMsg.replace("(chain ", "(chains ");
					//Add next chain
					tempRangeObj[rangObjKey].tooltipMsg = tempRangeObj[rangObjKey].tooltipMsg.replace(")", ' '+mappingsData.chain_id+")");
					tempTextObj[rangObjKey].tooltipMsg = tempRangeObj[rangObjKey].tooltipMsg.replace(")", ' '+mappingsData.chain_id+")");
					
				  }else{
					var mapTooltip = '';
					
					var domainId;
					if(type === 'scop'){
					  domainId = MappingsApiArr[entryId].sccs;
					  mapTooltip += '<br><strong>'+domainId+'</strong><br>'+mappingsDetails.identifier;
					}else{
					  domainId = entryId;
					  mapTooltip += '<br><strong>'+domainId+'</strong><br>'+mappingsDetails.identifier;
					  if(mappingResult.idArr.indexOf(entryId) === -1){
						mappingResult.idArr.push(entryId);
					  }
					}
					
					if(type == 'uniprot'){
					  mapTooltip += '<br>UniProt range: '+mappingsData.unp_start+' - '+mappingsData.unp_end;
					}
					mapTooltip += '<br>PDB range: '+mappingsData.start.residue_number+' - '+mappingsData.end.residue_number+' (chain '+mappingsData.chain_id+')';
					
					tempRangeObj[rangObjKey] =
					  {
						pathRange : [[mappingsData.start.residue_number - 1,0],[mappingsData.end.residue_number - 1,0]],
						tooltipMsg : mapTooltip,
						tooltipPosition: 'postfix',
						pathData  : mappingsData,
						domainId: domainId,
						elementType: type,
						elementColor: colorArr[pathColorIndex],
						color: colorArr[pathColorIndex]
					  }
					  
					  tempTextObj[rangObjKey] =
						{
							textRange : [[(mappingsData.start.residue_number + ((mappingsData.end.residue_number - mappingsData.start.residue_number)/2)) - 1,0],[5,0]],
							textString  : mappingsDetails.identifier,
							pathData : mappingsData,
							pathClassPrefix : type+'Path'+pdbId,
							fitInPath: true,
							tooltipMsg : mapTooltip,
							tooltipPosition: 'postfix',
							elementType: type,
							elementColor: colorArr[pathColorIndex],
							color: colorArr[pathColorIndex]
						}
					  
					  pathColorIndex++;
					  if(pathColorIndex === totalColors){
						  pathColorIndex = 0;
					  }
					
				  }
					
				  
				}
			  });
			});
			
			//push the temprange data in shape content array
			angular.forEach(tempRangeObj, function(tempRangeDetails, tempRangeIndex){
			  mappingResult.unpShapeObj.shapeContent.push(tempRangeDetails);
			  mappingResult.mappingTextObj.shapeContent.push(tempTextObj[tempRangeIndex]);
			});
			
			return mappingResult;
			
		  }
		  
		  //Function to get seconday structure shape object
		  var getSecStrShapeObj = function(moleculesArr, entityId, bestStructAsymId){
			
			var secStrShapeArr = [];
			
			var helixShapeObj = {
			  shape : 'path',
			  shapeGroupClass : 'secStrPathGrp'+pdbId,
			  shapeClass : 'secStrPath'+pdbId+' secStrPath'+pdbId,
			  shapeHeight : 13,
			  showTooltip: true,
			  shapeContent : []
			};
			
			var strandShapeObj = {
			  shape : 'arrow',
			  shapeGroupClass : 'secStrPathGrp'+pdbId,
			  shapeClass : 'arrowPath secStrPath'+pdbId+' secStrPath'+pdbId,
			  shapeHeight : 1,
			  showTooltip: true,
			  shapeContent : []
			};
				
			var tempRangeObj = {}
			angular.forEach(moleculesArr, function(moleculesData, entryId){
			  //angular.forEach(moleculesData.mappings, function(mappingsData, mappingsIndex){
				if(moleculesData.entity_id == entityId){
				  
				  angular.forEach(moleculesData.chains, function(chainData, chainIndex){
					
					//check chain id for to show seconday structure of the best chain
					if(chainData.struct_asym_id != bestStructAsymId){
						return;
					}
					
					//Check Strands
					angular.forEach(chainData.secondary_structure, function(secStrData, secStrType){
					  if(typeof secStrData !== 'undefined' && secStrData){
						angular.forEach(secStrData, function(secStrRange, secStrRangeIndex){
						  var strObj = {
							pathData: {
								chain_id: chainData.chain_id,
								struct_asym_id: chainData.struct_asym_id,
								start: secStrRange.start,
								end: secStrRange.end
							},
							pathRange : [
							  [secStrRange.start.residue_number - 1, 0],
							  [secStrRange.end.residue_number - 1,0]
							],
							tooltipMsg : '',
							elementType: secStrType.slice(0,-1)
						  };
						  
						  if(secStrType === 'helices'){
							strObj.tooltipMsg = 'A helix in chain '+chainData.chain_id;
							strObj.elementColor = commonServices.specificColors.brass;
							strObj.color = commonServices.specificColors.brass;
							helixShapeObj.shapeContent.push(strObj)
						  }else if(secStrType === 'strands'){
							strObj.tooltipMsg = 'A strand in a sheet in chain '+chainData.chain_id;
							strObj.elementColor = commonServices.specificColors.airForceBlue;
							strObj.color = commonServices.specificColors.airForceBlue;
							strandShapeObj.shapeContent.push(strObj)
						  }
						});
					  }
					});
				  });
				
				}
			  //});
			});
			
			if(helixShapeObj.shapeContent.length > 0){
			  secStrShapeArr.push(helixShapeObj)
			}
			
			if(strandShapeObj.shapeContent.length > 0){
			  secStrShapeArr.push(strandShapeObj)
			}
			
			return secStrShapeArr;
			
		  }
		  
		  //Function to get quality details for a chain
		  var getQualityDetails = function(qualityArr, chainShapeContent, entityId, pdbId){
			var chainId = chainShapeContent[0].pathData.chain_id;
			var structAsymId = chainShapeContent[0].pathData.struct_asym_id
			var qualityShapesArr = [
			  {
				shape : 'path',
				shapeGroupClass : 'quality'+chainId+'PathGrp'+pdbId,
				shapeClass : 'quality'+chainId+'Path'+pdbId+' quality'+chainId+'Path'+pdbId,
				shapeHeight : 15,
				showTooltip: true,
				shapeContent : []
			  }
			];
			
			//Create green path for no quality issues
			angular.forEach(chainShapeContent, function(chainData, index){
			  var rangeObj = {
				pathData : chainData.pathData,
				pathRange: [[chainData.pathRange[0][0],0],[chainData.pathRange[1][0],0]],
				tooltipMsg: 'No validation issue reported for',
				tooltipPosition: 'prefix',
				elementType: 'quality',
				color: commonServices.specificColors.qualityGreen
			  }
			  
			  qualityShapesArr[0].shapeContent.push(rangeObj);
			});
			
			angular.forEach(qualityArr, function(qualityData, qualityDataIndex){
			  if(qualityData.entity_id == entityId){
				
				//Iterate chains array in outliers
				angular.forEach(qualityData.chains, function(chainDataObj, chainDataIndex){
					if(chainDataObj.chain_id == chainId){
					
					//Iterate models array in chains array in outliers
					angular.forEach(chainDataObj.models, function(chainModelObj, chainDataIndex){
					  
					  //Iterate residues array in models array in outliers
					  angular.forEach(chainModelObj.residues, function(outlierResidue, index){
						
						var qualityShapeObj = {
						  shape : 'path',
						  shapeGroupClass : 'quality'+chainId+'PathGrp'+pdbId,
						  shapeClass : 'qualityOverlay'+chainId+'Path'+pdbId+' qualityOverlay'+chainId+'Path'+pdbId,
						  shapeHeight : 15,
						  showTooltip: true,
						  shapeContent : [{
							pathData: outlierResidue,
							pathRange: [[outlierResidue.residue_number - 1.5,0],[outlierResidue.residue_number - 0.5,0]],
							tooltipMsg: '',
							tooltipPosition: 'prefix',
							elementType: 'quality_outlier',
							color: commonServices.specificColors.qualityYellow
						  }]
						};
						
						var issueSpell = 'issue';
						qualityShapeObj.shapeContent[0].pathData['chain_id'] = chainId; //Add chain id to the quality path data
						qualityShapeObj.shapeContent[0].pathData['struct_asym_id'] = structAsymId
						if(outlierResidue.outlier_types.length === 1 && outlierResidue.outlier_types[0] === 'RSRZ'){
						  qualityShapeObj.shapeContent[0].color = commonServices.specificColors.qualityRed;
						  qualityShapeObj.shape = 'circle';
						  qualityShapeObj.shapeClass = 'qualityCircle'+chainId+''+pdbId+''+index;
						  qualityShapeObj.marginTop = -13;
						  qualityShapeObj.shapeContent[0]['residue_number'] = outlierResidue.residue_number;
						  qualityShapeObj.shapeContent[0]['marginTop'] = -13;
						}else if(outlierResidue.outlier_types.length === 1){
						  qualityShapeObj.shapeContent[0].color = commonServices.specificColors.qualityYellow;
						}else if(outlierResidue.outlier_types.length === 2){
						  qualityShapeObj.shapeContent[0].color = commonServices.specificColors.burntOrangeBright;
						  issueSpell = 'issues';
						}else{
						  qualityShapeObj.shapeContent[0].color = commonServices.specificColors.qualityRed;
						  issueSpell = 'issues';
						}
						qualityShapeObj.shapeContent[0].tooltipMsg = 'Validation '+issueSpell+': '+outlierResidue.outlier_types.join(', ')+'<br>';
						
						qualityShapesArr.push(qualityShapeObj);
						
					  
					  });
					  
					});
				  
				  }
				  
				  
				});
				  
			  }
			  
			});
			
			if(qualityShapesArr[0].shapeContent.length > 0){
			  return qualityShapesArr;
			}else{
			  return [];
			}
		  }
		  
		  //Function to get best chain from polymer coverage
		  var getChainDetails = function(polymerArr, entityId, pdbId, chainType, bestStructAsymId){
			var chainDetails = [];
			angular.forEach(polymerArr, function(polymerData, polymerDataIndex){
			  if(polymerData.entity_id == entityId){
				
				var chainColorIndex = 0;
				if(chainType === 'other') chainColorIndex = 1;
					 
				angular.forEach(polymerData.chains, function(chainsArr, chainDataIndex){
				  
				  if(chainType === 'other' && chainsArr.struct_asym_id == bestStructAsymId){
					return;
				  }
				  
				  var chainShapeObj = {
					shape : 'path',
					shapeGroupClass : 'chain'+chainsArr.chain_id+'PathGrp'+pdbId,
					shapeClass : 'seqPath chain'+chainsArr.chain_id+'Path'+pdbId+' chain'+chainsArr.chain_id+'Path'+pdbId,
					//shapeColour : chainColor,
					shapeHeight : 15,
					showTooltip: true,
					shapeContent : []
				  };
				  
				  var totalObserved = chainsArr.observed.length
				  for(var i=0; i < totalObserved; i++){
					
					//Add range
					chainShapeObj.shapeContent.push(
					  {
						pathRange : [
						  [chainsArr.observed[i].start.residue_number - 1, 0],
						  [chainsArr.observed[i].end.residue_number - 1,0]
						],
						pathData  : {
						  chain_id: chainsArr.chain_id,
						  struct_asym_id: chainsArr.struct_asym_id,
						  entity_id: entityId,
						  chain_range: chainsArr.observed[i].start.residue_number+'-'+chainsArr.observed[i].end.residue_number
						},
						elementType: 'chain',
						color: commonServices.colorGradients.darkStack[chainColorIndex]
					  }
					)
					
				  }
				  
				  chainColorIndex++;
				  if(chainColorIndex === commonServices.colorGradients.darkStack.length){
					  chainColorIndex = 0;
				  }
				  
				  chainDetails.push(chainShapeObj);
				  
				});
				  
			  }
			  
			});
			
			return chainDetails;
		  }
		  
		  //Function to get range to fillup chain spaces
		  var getChainFillupRange = function(chainRangeArr, pathGroupClass, chainId, pdbId){
			
			//Chain fillup shape object
			var chainFillupObj = {
			  shape : 'path',
			  shapeGroupClass : pathGroupClass,
			  shapeClass : 'nonSeqPath chain'+chainId+'nonSeqPath'+pdbId+' chain'+chainId+'nonSeqPath'+pdbId,
			  shapeHeight : 6,
			  showTooltip: true,
			  shapeContent : []
			};
			
			var totalChainPaths = chainRangeArr.length;
			
			for(var i = 0; i < totalChainPaths; i++){
			  if(typeof chainRangeArr[i + 1] !== 'undefined'){
				chainFillupObj.shapeContent.push(
				  {
					pathRange : [[chainRangeArr[i].pathRange[1][0],0],[chainRangeArr[i + 1].pathRange[0][0],0]],
					pathData  : '',
					elementType: 'unobserved residues',
					color: commonServices.specificColors.lightGray
				  }
				)
			  }
			}
		  
			if(chainFillupObj.shapeContent.length > 0){
			  return chainFillupObj;
			}else{
			  return {};
			}
		  }
		  
		  //Function to get Binding Sites shape object
		  var getBindingSiteShapeObj = function(bindingSitesArr, current_struct_asym_id, entityId, pdbId){
			var bindingSiteRecs = {};
			var bindingSiteShapes = [];
			angular.forEach(bindingSitesArr, function(bindingSiteData, bindingSiteIndex){
			  if(typeof bindingSiteData.site_residues !== 'undefined' && typeof bindingSiteData.ligand_residues !== 'undefined'){
				var ligandDataArr = bindingSiteData.ligand_residues;
				var siteDataArr = bindingSiteData.site_residues;
				
				//Iterate over ligand_residues data to create the description text
				var descArr = [];
				angular.forEach(ligandDataArr, function(ligandData, ligandDataIndex){
				  var subDescArr = [];
				  
				  if(ligandData.chem_comp_id !== null){
					subDescArr.push(ligandData.chem_comp_id);
				  }
				  if(ligandData.chain_id !== null){
					subDescArr.push(ligandData.chain_id);
				  }
				  if(ligandData.author_residue_number !== null){
					subDescArr.push(ligandData.author_residue_number);
				  }
				  if(ligandData.author_insertion_code !== null){
					subDescArr.push(ligandData.author_insertion_code);
				  }
				  if(subDescArr.length > 0){
				  	descArr.push(subDescArr.join('-'));
				  }
				});
				
				//Store the desc in an object with site_id as key
				if(typeof bindingSiteRecs[bindingSiteData.site_id] === 'undefined'){
				  bindingSiteRecs[bindingSiteData.site_id] = {}
				}
				
				if(typeof bindingSiteRecs[bindingSiteData.site_id]['desc'] === 'undefined'){
				  bindingSiteRecs[bindingSiteData.site_id]['desc'] = ''
				}
				
				bindingSiteRecs[bindingSiteData.site_id]['desc'] = descArr.join(' :: ');
				
				//Iterate over sites_residues data to get the ranges for bind sites
				angular.forEach(siteDataArr, function(siteData, siteDataIndex){
				  
				  if(siteData.struct_asym_id != current_struct_asym_id) return;
				  
				  //Store the residue number in an object with site_id as key
				  if(typeof bindingSiteRecs[bindingSiteData.site_id]['ranges'] === 'undefined'){
					bindingSiteRecs[bindingSiteData.site_id]['ranges'] = [];
				  }
				  
				  bindingSiteRecs[bindingSiteData.site_id]['ranges'].push(
					{
					  residue_number: siteData.residue_number,
					  tooltipMsg: '',
					  tooltipPosition: 'postfix',
					  marginTop: -13,
					  elementType: 'binding site',
					  pathData: siteData,
					  color: ''
					}
				  );
				
				
				});
				
			  }
			});
			
			//Create the shape objects model
			var descColorObject = {} //description/color object
			var siteColorIndex = 0;
			var totalGreenColorStack = commonServices.colorGradients.greenStack.length;
			angular.forEach(bindingSiteRecs, function(bindingSiteRecsData, siteId){
			  if(typeof bindingSiteRecsData.ranges !== 'undefined'  && bindingSiteRecsData.ranges.length > 0){
				var bShapeObj = {
				  shape : 'triangle-up',
				  shapeGroupClass : 'bindingSite'+current_struct_asym_id+'PathGrp'+pdbId,
				  shapeClass : 'bindingSite'+current_struct_asym_id+'Path'+pdbId,
				  shapeHeight : 15,
				  showTooltip: true,
				  marginTop: -13,
				  shapeContent: []
				}
				
				angular.forEach(bindingSiteRecsData.ranges, function(bindingSiteRangeData, rangeId){
				  bindingSiteRangeData.tooltipMsg = 'is in binding site';
				  if(bindingSiteRecsData.desc !== ''){
					   bindingSiteRangeData.tooltipMsg += ' of '+bindingSiteRecsData.desc;
				  }
				  
				  //set color for shape
				  if(bindingSiteRecsData.desc === ''){
					  if(typeof descColorObject['null'] !== 'undefined'){
						  bindingSiteRangeData.color = descColorObject['null'];
					  }else{
						  bindingSiteRangeData.color = commonServices.colorGradients.greenStack[siteColorIndex];
						  descColorObject['null'] = bindingSiteRangeData.color;
						  siteColorIndex++;
					  }
				  }else if(typeof descColorObject[bindingSiteRecsData.desc] !== 'undefined'){
					  bindingSiteRangeData.color = descColorObject[bindingSiteRecsData.desc];
				  }else{
					  bindingSiteRangeData.color = commonServices.colorGradients.greenStack[siteColorIndex];
					  descColorObject[bindingSiteRecsData.desc] = bindingSiteRangeData.color;
					  siteColorIndex++;
				  }
				  
				  //Re-iterate on color stack array
				  if(siteColorIndex === totalGreenColorStack){
					  siteColorIndex = 0;
				  }
				  
				  //push details into shape content array
				  bShapeObj.shapeContent.push(bindingSiteRangeData)
				});
				
				bindingSiteShapes.push(bShapeObj);
			  
			  }
			});
			
			return bindingSiteShapes;
		  }
		  
		  //Function to get Conformer shape object
		  var getConformerShapeObj = function(residueListingArr, currentChainId, shapeParentGrp, entityId, pdbId, molSeqArr, currentChainAsymId){
			var confShapesArr = [];
			var hetShapeObj = {
					shape : 'path',
					shapeGroupClass : shapeParentGrp,
					shapeClass : 'hetConformer'+currentChainId+'Path'+pdbId,
					shapeHeight : 15,
					marginTop : 0,
					showTooltip: true,
					shapeContent : []
				}
				
				var altShapeObj = {
					shape : 'path',
					shapeGroupClass : shapeParentGrp,
					shapeClass : 'altConformer'+currentChainId+'Path'+pdbId,
					shapeHeight : 15,
					marginTop : 0,
					showTooltip: true,
					shapeContent : []
				}
				
				//Text shape object for mutation text on top of mutation area
				var textObj = {
					shape : 'text',
					shapeGroupClass : shapeParentGrp,
					shapeClass : 'showTextOnZoom singleTextEle altConformer_text_'+currentChainId+'Path'+pdbId,
					shapeHeight : 15,
					marginTop : 2,
					showTooltip: true,
					shapeContent : []
				}
				
			  angular.forEach(residueListingArr, function(residueListingData, residueListingIndex){
			  if(residueListingData.entity_id == entityId){
				
				//Iterate over chains
				angular.forEach(residueListingData.chains, function(chainsData, chainsDataIndex){
				  
				  if(chainsData.chain_id == currentChainId){
					
					//Iterate over chains residues
					angular.forEach(chainsData.residues, function(residuesData, residuesDataIndex){
				  
					  if(typeof residuesData.multiple_conformers !== 'undefined'){
						
						var chemCompIdCheck = {};
						angular.forEach(residuesData.multiple_conformers, function(multipleConformerData, mi){
									if(typeof chemCompIdCheck[multipleConformerData.chem_comp_id] === 'undefined'){
										chemCompIdCheck[multipleConformerData.chem_comp_id] = {};
									}
									chemCompIdCheck[multipleConformerData.chem_comp_id][multipleConformerData.alt_code] = 1;
									
								});
								
								var textObjTooltip = '';
                                residuesData['struct_asym_id'] = currentChainAsymId;
                                residuesData['chain_id'] = currentChainId;
								if(Object.keys(chemCompIdCheck).length > 1) {
									textObjTooltip = ' has microheterogeneity.';
									hetShapeObj.shapeContent.push(
									  {
										pathRange : [[residuesData.residue_number - 1 - 0.5,0],[residuesData.residue_number - 1 + 0.5,0]],
										tooltipMsg: textObjTooltip,
										tooltipPosition: 'postfix',
										elementType: 'Het Conformer',
										pathData: residuesData,
										color: commonServices.specificColors.airForceBlue
									  }
									);
									
								} else {
									textObjTooltip = ' has alternate conformers.';
									altShapeObj.shapeContent.push(
									  {
										pathRange : [[residuesData.residue_number - 1 - 0.5,0],[residuesData.residue_number - 1 + 0.5,0]],
										tooltipMsg: textObjTooltip,
										tooltipPosition: 'postfix',
										elementType: 'alternate conformer',
										pathData: residuesData,
										color: commonServices.specificColors.airForceBlue
									  }
									);
									
								}
								
								//conformer text range
								textObj.shapeContent.push(
								{
									textRange : [[residuesData.residue_number - 1,0],[4,0]],
										tooltipMsg: textObjTooltip,
										tooltipPosition: 'postfix',
										textString  : molSeqArr[residuesData.residue_number - 1],
										pathData: residuesData
									}
								);
						  
					  }
					  
					});
					  
				  }
				  
				});
				
			  }
			});
			
			if(hetShapeObj.shapeContent.length > 0){
			  confShapesArr.push(hetShapeObj);
			}
			
			if(altShapeObj.shapeContent.length > 0){
			  confShapesArr.push(altShapeObj);
			}
			
			if(textObj.shapeContent.length > 0){
			  confShapesArr.push(textObj);
			}
			
			return confShapesArr;
			
		  }
		  
		  //Data model initialization
		  var pdbDataModel = {
			groups: [],
			shapes: [],
			pathLeftLabels : []
		  }
		  
		  
		  var initMargin = 0; //Top margin flag
		  var pdbPathColorIndex = 0; //seqViewerService.getPathColorIndex();
		  
		  //If entities api data is present then create the base model object structure
		  if(typeof respData[pdbId].entities !== 'undefined'){
			
			pdbDataModel = {
			  options: {
				seqId: pdbId,
				seqStr: '',
			  },
			  groups: [
				{ label : '', class : 'moleculeGrp', parentGroup : '', marginTop: 8},
				{ label : '', class : 'molPathGrp', parentGroup : 'moleculeGrp', marginTop: 1},
				{ label : '', class : 'molSeqGrp', parentGroup : 'moleculeGrp', marginTop: 14}
			  ],
			  shapes: [
				{
				  shape : 'path',
				  shapeGroupClass : 'molPathGrp',
				  shapeClass : 'seqPath molPath',
				  shapeHeight : 15,
				  marginTop: 0,
				  showTooltip: true,
				  shapeContent : [
					{
					  pathRange : [[0,0],[0,0]],
					  pathData  : {
						pdbId: pdbId,
						pdbSeq: ''
					  },
					  elementType: 'molecule',
					  color: commonServices.specificColors.lightGray,
					  tooltipMsg: '<br><strong>'+ pdbId +'</strong>',
					  tooltipPosition: 'postfix'
					}
				  ]
				},
				{
				  shape : 'sequence',
				  shapeGroupClass : 'molSeqGrp',
				  shapeClass : 'molSeq',
				  shapeContent: {
					  pathRange : [[0,0],[0,0]],
					  pathData  : {
						pdbId: pdbId,
					  },
					  elementType: 'molecule',
					  color: commonServices.specificColors.lightGray,
					  tooltipMsg: '<br><strong>'+ pdbId +'</strong>',
					  tooltipPosition: 'postfix'		
				  },
				  showTooltip: true
				}
			  ],
			  pdbIdArr : [],
			  pathLeftLabels : []
			};
			
			//Get sequence details from entity data 
			var currentEntityDetails = getCurrentEntityDetails(respData[pdbId].entities, entityId);
			
			//Set Molecule Sequence and path lenth
			pdbDataModel.options.seqStr = pdbDataModel.shapes[0].shapeContent[0].pathData.pdbSeq = currentEntityDetails.sequence;
			pdbDataModel.shapes[0].shapeContent[0].pathRange[1][0] = currentEntityDetails.sequence.length;
		  
		  }
		  
		  //Get Mappings Uniprot and Pfam Shapes
		  if(typeof respData[pdbId].mappings !== 'undefined'){
			var mappingsNameArr = ['UniProt', 'Pfam'];
			
			angular.forEach(mappingsNameArr, function(mappingsType, index){
			  var classPrefix = mappingsType.toLowerCase();
			  if(typeof respData[pdbId].mappings[mappingsType] !== 'undefined' && respData[pdbId].mappings[mappingsType]){
				var mappingResult = getMappingsShapeObj(respData[pdbId].mappings[mappingsType], entityId, classPrefix, commonServices.colorBox3[pdbPathColorIndex], bestStructAsymId);
				var mappingShape = mappingResult.unpShapeObj;
				if(typeof mappingShape.shapeContent !== 'undefined' && mappingShape.shapeContent.length > 0){
				  pdbDataModel.groups.push({ label : pdbId, class : classPrefix+'PathGrp'+pdbId, parentGroup : '', marginTop: (initMargin + 20)});
				  
				  pdbDataModel.shapes.push(mappingShape);
				  pdbDataModel.shapes.push(mappingResult.mappingTextObj);
				  
				  initMargin += 30;
				  pdbPathColorIndex++;
				  pdbDataModel.pathLeftLabels.push(mappingsType);
				}
				
				//store uniprot ids separately for creating unipdb selectbox
				if(mappingResult.idArr.length > 0 && mappingsType === 'UniProt'){
				  pdbDataModel.options['uniprotIdArr'] = mappingResult.idArr;
				}
				
			  }
			});
		  }
		  
		  //Get Best chain from polymer coverage
		  var polymerMoleculesData = '';
		  var chainType = 'other';
		  if(typeof respData[pdbId].polymerCoveragePerChain !== 'undefined'){
			polymerMoleculesData = respData[pdbId].polymerCoveragePerChain;
			chainType = 'best';
		  }else if(typeof respData[pdbId].polymerCoverage !== 'undefined'){
			polymerMoleculesData = respData[pdbId].polymerCoverage;
			
			//Get the last path group margin
			var pathsInRevOrder = ['scopPathGrp'+pdbId, 'cathPathGrp'+pdbId, 'secStrPathGrp'+pdbId, 'quality'+bestChainId+'PathGrp'+pdbId];
			for(var i = 0; i < 3; i++){
			  var svgEleGrp = parentEle.select('.'+pathsInRevOrder[i]);
			  if(svgEleGrp[0][0] !== null){ //Check if path group exist
				var grpTransformStr = svgEleGrp.attr('transform');
				var grpMargin = parseInt(grpTransformStr.substring(grpTransformStr.lastIndexOf(",") + 1,grpTransformStr.lastIndexOf(")"))) - (20 - marginTop);
				if(grpMargin > initMargin){
				  initMargin = grpMargin;
				}
			  }
			}
			
		  }
		  
		  if(typeof polymerMoleculesData !== 'undefined' && polymerMoleculesData !== ''){
			var chainDetails = getChainDetails(polymerMoleculesData.molecules, entityId, pdbId, chainType, bestStructAsymId);
			
			if(chainDetails.length > 0){
			  
			  angular.forEach(chainDetails, function(chainShapeObj, index){
				var currentChainId = chainShapeObj.shapeContent[0].pathData.chain_id;
                var chainGrpClass = chainShapeObj.shapeGroupClass;
				if(chainType === 'other'){
				  chainGrpClass = chainShapeObj.shapeGroupClass+' otherChainPaths';
				}
				
				pdbDataModel.groups.push({ label : pdbId, class : chainGrpClass, parentGroup : '', marginTop: (initMargin + 20)});
				pdbDataModel.shapes.push(chainShapeObj);
								
				//Add sequence on chain path
				
				pdbDataModel.shapes.push(
				  {
					shape : 'sequence',
					marginTop: 13,
					shapeGroupClass : chainDetails[index].shapeGroupClass,
					shapeClass : 'chain'+currentChainId,
					shapeColour : commonServices.specificColors.airForceBlue,
					shapeContent: chainShapeObj.shapeContent[0],
					showTooltip: true
				  }
				);
				
				var chainFillupPath = getChainFillupRange(chainShapeObj.shapeContent, chainShapeObj.shapeGroupClass, currentChainId, pdbId);
				
				if(chainFillupPath){
				  pdbDataModel.shapes.push(chainFillupPath);
				}
			  
				initMargin += 30;
				pdbPathColorIndex++;
				pdbDataModel.pathLeftLabels.push('Chain '+currentChainId);
			  
				//Get quality path details for the chain
				var outlierMoleculesData = '';
				var qualityPathGrpClass = 'quality'+currentChainId+'PathGrp'+pdbId;
				if(typeof respData[pdbId].outliers !== 'undefined'){
				  outlierMoleculesData = respData[pdbId].outliers;
				}else if(typeof outlierApiData !== 'undefined' && outlierApiData !== ''){
				  outlierMoleculesData = outlierApiData;
				  qualityPathGrpClass = 'quality'+currentChainId+'PathGrp'+pdbId+' otherChainPaths';
				}
				if(typeof outlierMoleculesData !== 'undefined'){
				  var qualityDetailsArr = getQualityDetails(outlierMoleculesData.molecules, chainShapeObj.shapeContent, entityId, pdbId);
				  if(qualityDetailsArr){
					pdbDataModel.groups.push({ label : pdbId, class : qualityPathGrpClass, parentGroup : '', marginTop: (initMargin + 20)});
					pdbDataModel.shapes = pdbDataModel.shapes.concat(qualityDetailsArr);
					
					initMargin += 30;
					pdbPathColorIndex++;
					pdbDataModel.pathLeftLabels.push('Quality');
						
				  }
				}
				
				//Get Binding sites for the chain
				var BindingSitesData = '';
				var currentChainAsymId = chainShapeObj.shapeContent[0].pathData.struct_asym_id;
				var bindingSiteGrpClass = 'bindingSite'+currentChainAsymId+'PathGrp'+pdbId;
				if(typeof respData[pdbId].bindingSites !== 'undefined'){
				  BindingSitesData = respData[pdbId].bindingSites;
				}else if(typeof bindingSitesApiData !== 'undefined' && bindingSitesApiData !== ''){
				  BindingSitesData = bindingSitesApiData;
				}
				if(typeof BindingSitesData !== 'undefined'){
				  var bindingSitesArr = getBindingSiteShapeObj(BindingSitesData, currentChainAsymId, entityId, pdbId);
				  
				  if(bindingSitesArr.length > 0){
					pdbDataModel.groups.push({ label : pdbId, class : bindingSiteGrpClass, parentGroup : chainShapeObj.shapeGroupClass, marginTop: 0});
					pdbDataModel.shapes = pdbDataModel.shapes.concat(bindingSitesArr);
				  }
				}
				
				//Get alternate conformer for the chain
				var residueListingData = '';
				var conformerGrpClass = 'conformer'+currentChainId+'PathGrp'+pdbId;
				if(typeof respData[pdbId].residueListing !== 'undefined'){
				  residueListingData = respData[pdbId].residueListing;
				}else if(typeof residueListingApiData !== 'undefined' && residueListingApiData !== ''){
				  residueListingData = residueListingApiData;
				}
				if(typeof residueListingData !== 'undefined'){
				  var molSeqArr = []
				  if(typeof pdbDataModel.options !== 'undefined' && typeof pdbDataModel.options.seqStr !== 'undefined' && pdbDataModel.options.seqStr !== ''){
					molSeqArr = pdbDataModel.options.seqStr.split('');
				  }else if(typeof sequenceArr !== 'undefined' && sequenceArr){
					molSeqArr = sequenceArr;
				  }
				  var conformerShapesArr = getConformerShapeObj(residueListingData.molecules, currentChainId, chainShapeObj.shapeGroupClass, entityId, pdbId, molSeqArr, currentChainAsymId);
				  
				  if(conformerShapesArr.length > 0){
					pdbDataModel.groups.push({ label : pdbId, class : chainShapeObj.shapeGroupClass, parentGroup : '', marginTop: 0});
					pdbDataModel.shapes = pdbDataModel.shapes.concat(conformerShapesArr);
				  }
				}
			  
				
			  });
				  
			}
		  
		  }
		  
		  //Get Secondary structure shapes
		  if(typeof respData[pdbId].secStrutures !== 'undefined'){
			if(typeof respData[pdbId].secStrutures.molecules !== 'undefined' && respData[pdbId].secStrutures.molecules){
			  var secStrShape = getSecStrShapeObj(respData[pdbId].secStrutures.molecules, entityId, bestStructAsymId);
			  
			  if(secStrShape.length > 0){
				pdbDataModel.groups.push({ label : pdbId, class : 'secStrPathGrp'+pdbId, parentGroup : '', marginTop: (initMargin + 20)});
				pdbDataModel.shapes = pdbDataModel.shapes.concat(secStrShape);
				
				initMargin += 30;
				//pdbPathColorIndex++;
				pdbDataModel.pathLeftLabels.push('Sec. Str.');
					
			  }
			  
			}
		  }
		  
		  //Get Mappings Cath and SCOP Shapes
		  if(typeof respData[pdbId].mappings !== 'undefined'){
			var mappingsNameArr1 = ['CATH', 'SCOP'];
			
			angular.forEach(mappingsNameArr1, function(mappingsType, index){
			  var classPrefix = mappingsType.toLowerCase();
			  if(typeof respData[pdbId].mappings[mappingsType] !== 'undefined' && respData[pdbId].mappings[mappingsType]){
				var mappingResult = getMappingsShapeObj(respData[pdbId].mappings[mappingsType], entityId, classPrefix, commonServices.colorBox3[pdbPathColorIndex], bestStructAsymId);
				var mappingShape = mappingResult.unpShapeObj;
				if(typeof mappingShape.shapeContent !== 'undefined' && mappingShape.shapeContent.length > 0){
				  pdbDataModel.groups.push({ label : pdbId, class : classPrefix+'PathGrp'+pdbId, parentGroup : '', marginTop: (initMargin + 20)});
				  
				  pdbDataModel.shapes.push(mappingShape);
				  pdbDataModel.shapes.push(mappingResult.mappingTextObj);
				  
				  initMargin += 30;
				  pdbPathColorIndex++;
				  pdbDataModel.pathLeftLabels.push(mappingsType);
				}
			  }
			});
		  }
		  
		  //Get mutation shape object
		  if(typeof respData[pdbId].mutatedResidues !== 'undefined'){
			var mutResShapObj = $filter('modifiedResFilter')(respData[pdbId].mutatedResidues, {entityId: entityId}, pdbId, 15, 1, 5, 'mutatedResidues', 'pdbeSeq');
		  
			if(mutResShapObj.length > 0){
					
			  pdbDataModel.groups.push(
				{ label : '', class : 'mutationGrp mutationGrp_'+pdbId, parentGroup : 'moleculeGrp', marginTop: 8 }
			  );
			  
			  pdbDataModel.shapes = pdbDataModel.shapes.concat(mutResShapObj)
			}
		  }
		  
		  //Get Modified shape object
		  if(typeof respData[pdbId].modifiedResidues !== 'undefined'){
			var mutResShapObj = $filter('modifiedResFilter')(respData[pdbId].modifiedResidues, {entityId: entityId}, pdbId, 15, 1, 5, 'modifiedResidues', 'pdbeSeq');
		  
			if(mutResShapObj.length > 0){
					
			  pdbDataModel.groups.push(
				{ label : '', class : 'mutationGrp mutationGrp_'+pdbId, parentGroup : 'moleculeGrp', marginTop: 8 }
			  );
			  
			  pdbDataModel.shapes = pdbDataModel.shapes.concat(mutResShapObj)
			}
		  }
		  
		  //Update path color index
		  seqViewerService.setPathColorIndex(pdbPathColorIndex);
		  
		  return pdbDataModel;
		  
		}
	}]);

}());