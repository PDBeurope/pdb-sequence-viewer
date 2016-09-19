angular.module("template/sequenceView/pdb.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/sequenceView/pdb.html",
  	 '<div class="button-group" ng-show="showViewBtn" ng-style="styles.btnGrp">'+
		'<ul style="float:right">'+
			'<li><a ng-click="activeViewBtn = \'compact\'" ng-class="{\'active\' : activeViewBtn == \'compact\'}" title="Compact View" href="javascript:void(0);">Compact</a></li>'+
			'<li><a ng-click="activeViewBtn = \'expanded\'" ng-class="{\'active\' : activeViewBtn == \'expanded\'}" title="Expanded View" href="javascript:void(0);">Expanded</a></li>'+
		'</ul>'+
	  '</div>'+
	  '<div class="seqViewerWrapper" style="clear:both;" ng-style="styles.wrapper">'+
		'<div ng-style="seqViewerOverlay" ng-show="overlayText != \'\'"><span ng-style="seqViewerOverlayMessage">{{overlayText}}</span></div>'+
		'<div ng-style="styles.labelsBg">&nbsp;</div>'+
		'<div class="loadMoreChainCl" ng-style="styles.loadMoreStyle" ng-show="showLoadMoreLink">'+
		  '<a href="javascript:void(0);" class="loadMoreBtn" ng-click="loadMoreChains()">load more chains</a>'+
		'</div>'+
		'<div class="loadMoreChainCl chainHideShowBtnCl" ng-style="styles.loadMoreStyle" ng-show="chiansHideShowBtn">'+
		  '<a href="javascript:void(0);" class="loadMoreBtn" ng-click="hideShowChainsFn()">Show {{chainsViewStatus}} chains</a>'+
		'</div>'+
		'<div class="topSection" ng-style="styles.topSection">'+
		  '<div class="topLeftSection" ng-style="styles.leftSecStyle" style="height:100%" ng-show="showLabels">'+
		  	  '<div class="pdbPathLeftLabel" style="margin-top:42px">Molecule</div>'+
		  '</div>'+
		  '<a class="SeqScrollArrow" ng-style="styles.scrollArrowLeft" href="javascript:void(0);" title="Scroll Left">'+
			'<span ng-mouseup="stopMovingPan()" ng-mousemove="stopMovingPan()" ng-mousedown="movePan(50)" class="icon-black" data-icon="&lt;"></span>'+
		  '</a>'+
		  '<div class="topRightSection">'+
			'<svg class="topSvg" ng-style="styles.topSvg">'+
			  '<g class="scaleGrp" transform="translate(10,25)"><g class="x axis"></g></g>'+
			'</svn>'+
		  '</div>'+
		  '<a class="SeqScrollArrow" ng-style="styles.scrollArrowRight" href="javascript:void(0);" title="Scroll Right">'+
		  	'<span ng-mouseup="stopMovingPan()" ng-mousemove="stopMovingPan()" ng-mousedown="movePan(-50)" class="icon-black" data-icon="&gt;"></span>'+
		  '</a>'+
		'</div>'+
		'<div class="bottomSection" ng-style="styles.bottomSection">'+
		  '<div class="bottomLeftSection" ng-style="styles.leftSecStyle" ng-show="showLabels">'+
		    '<div class="pdbPathLeftLabel" ng-repeat="leftLabel in pathLeftLabels track by $index" ng-style="{\'margin-top\': $index == 0 ? \'13px\' : \'20px\', \'height\': \'10px\', \'line-height\': \'10px\'}">{{leftLabel}}</div>'+
			'<div class="pdbPathLeftLabel moreChainLabels" ng-repeat="moreChainLabel in pathMoreLeftLabels track by $index" ng-style="{\'margin-top\': \'20px\', \'height\': \'10px\', \'line-height\': \'10px\'}">{{moreChainLabel}}</div>'+
		  '</div>'+
		  '<div class="bottomRightSection">'+
			'<svg class="bottomSvg" ng-style="styles.bottomSvg" >'+
			  '<g class="shapesGrp" transform="translate(10,-17)">'+
				'<rect class="seqSvgBg" x="0" y="0" fill="white" stroke="none" ng-style="styles.bottomSvg" ></rect>'+
			  '</g>'+
			'</svg>'+
		  '</div>'+
		'</div>'+
		
	  '</div>');
}]);