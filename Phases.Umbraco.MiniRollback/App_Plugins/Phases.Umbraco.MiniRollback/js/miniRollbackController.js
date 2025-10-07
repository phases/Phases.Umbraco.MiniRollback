// Dynamically load CSS file - ensures it loads even when Debug: false
/*
(function () {
    if (!document.getElementById('miniRollbackStyles')) {
        var cssLink = document.createElement('link');
        cssLink.id = 'miniRollbackStyles';
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = '/App_Plugins/Phases.Umbraco.MiniRollback/css/style.minirollback.css';
        document.head.appendChild(cssLink);
    }
})();
*/

// BEST SOLUTION: HTTP Interceptor to suppress MiniRollback 404 errors
angular.module("umbraco").config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push(['$q', function ($q) {
        return {
            'responseError': function (rejection) {
                // Suppress 404 errors for MiniRollback endpoints
                if (rejection.status === 404 &&
                    rejection.config &&
                    rejection.config.url &&
                    (rejection.config.url.indexOf('MiniRollbackApi') !== -1 ||
                        rejection.config.url.indexOf('lastvalues') !== -1)) {
                    // Silently reject without showing notification
                    return $q.reject(rejection);
                }
                // Let other errors through
                return $q.reject(rejection);
            }
        };
    }]);
}]);

angular.module("umbraco").config(['$provide', function ($provide) {
    $provide.decorator("umbPropertyEditorDirective", ['$delegate', '$http', '$compile', function ($delegate, $http, $compile) {
        var directive = $delegate[0];
        var linkFn = directive.link;

        // Text diff function to highlight changes
        function createTextDiff(oldText, newText) {
            if (!oldText || !newText) return escapeHtml(newText || '');

            // Ensure we're working with strings
            oldText = String(oldText);
            newText = String(newText);

            // Simple word-level diff algorithm
            var oldWords = oldText.split(/(\s+)/);
            var newWords = newText.split(/(\s+)/);

            var result = [];
            var i = 0, j = 0;

            while (i < oldWords.length || j < newWords.length) {
                if (i >= oldWords.length) {
                    // Only new words remain - mark as added
                    result.push('<span class="mini-rollback-diff-added">' + escapeHtml(newWords[j]) + '</span>');
                    j++;
                } else if (j >= newWords.length) {
                    // Only old words remain - mark as deleted
                    result.push('<span class="mini-rollback-diff-removed">' + escapeHtml(oldWords[i]) + '</span>');
                    i++;
                } else if (oldWords[i] === newWords[j]) {
                    // Words match exactly
                    result.push(escapeHtml(newWords[j]));
                    i++;
                    j++;
                } else {
                    // Words don't match - simple replacement approach for clarity
                    result.push('<span class="mini-rollback-diff-removed">' + escapeHtml(oldWords[i]) + '</span>');
                    result.push('<span class="mini-rollback-diff-added">' + escapeHtml(newWords[j]) + '</span>');
                    i++;
                    j++;
                }
            }

            return result.join('');
        }

        function createRteCodeDiff(oldText, newText, isRte) {
            if (!oldText || !newText) return escapeHtml(newText || '');

            // Ensure we're working with strings
            oldText = String(oldText);
            newText = String(newText);

            if (isRte) {
                // For RTE, do character-level diff on the HTML code itself
                return createHtmlCodeDiff(oldText, newText);
            } else {
                // For regular text, use the existing word-level diff
                return createTextDiff(oldText, newText);
            }
        }

        // HTML Code Diff - treats HTML as code (not markup)
        function createHtmlCodeDiff(oldHtml, newHtml) {
            // Split by words and HTML brackets for better granularity
            var oldTokens = oldHtml.split(/(\s+|<[^>]*>)/);
            var newTokens = newHtml.split(/(\s+|<[^>]*>)/);

            var result = [];
            var i = 0, j = 0;

            while (i < oldTokens.length || j < newTokens.length) {
                if (i >= oldTokens.length) {
                    // Only new tokens remain
                    result.push('<span class="mini-rollback-diff-added">' + escapeHtml(newTokens[j]) + '</span>');
                    j++;
                } else if (j >= newTokens.length) {
                    // Only old tokens remain
                    result.push('<span class="mini-rollback-diff-removed">' + escapeHtml(oldTokens[i]) + '</span>');
                    i++;
                } else if (oldTokens[i] === newTokens[j]) {
                    // Tokens match
                    result.push(escapeHtml(newTokens[j]));
                    i++;
                    j++;
                } else {
                    // Tokens don't match - simple replacement
                    if (oldTokens[i].trim()) {
                        result.push('<span class="mini-rollback-diff-removed">' + escapeHtml(oldTokens[i]) + '</span>');
                    }
                    if (newTokens[j].trim()) {
                        result.push('<span class="mini-rollback-diff-added">' + escapeHtml(newTokens[j]) + '</span>');
                    }
                    i++;
                    j++;
                }
            }

            return result.join('');
        }

        function stripHtmlTags(html) {
            return html.replace(/<[^>]*>/g, '').trim();
        }

        function escapeHtml(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Enhanced function to extract clean text from RTE content
        function getCleanTextFromRte(rteContent) {
            if (!rteContent) return '';

            try {
                // If it's JSON with markup property
                if (rteContent.trim().startsWith('{') && rteContent.includes('"markup"')) {
                    var rteJson = JSON.parse(rteContent);
                    if (rteJson.markup) {
                        // Strip HTML tags to get clean readable text
                        return stripHtmlTags(rteJson.markup);
                    }
                }

                // If it's already HTML, strip tags
                if (rteContent.includes('<') && rteContent.includes('>')) {
                    return stripHtmlTags(rteContent);
                }

                // Otherwise return as is
                return rteContent;
            } catch (e) {
                // If parsing fails, try to strip HTML tags anyway
                return stripHtmlTags(rteContent);
            }
        }

        // Enhanced function to get formatted HTML from RTE content
        function getFormattedHtmlFromRte(rteContent) {
            if (!rteContent) return '';

            try {
                // If it's JSON with markup property
                if (rteContent.trim().startsWith('{') && rteContent.includes('"markup"')) {
                    var rteJson = JSON.parse(rteContent);
                    if (rteJson.markup) {
                        return rteJson.markup;
                    }
                }

                // Otherwise return as is
                return rteContent;
            } catch (e) {
                return rteContent;
            }
        }

        // Helper function for content summary
        function getContentSummary(htmlContent) {
            if (!htmlContent) return 'Empty content';

            // Count different elements
            var imgCount = (htmlContent.match(/<img/gi) || []).length;
            var pCount = (htmlContent.match(/<p/gi) || []).length;
            var divCount = (htmlContent.match(/<div/gi) || []).length;
            var linkCount = (htmlContent.match(/<a/gi) || []).length;
            var listCount = (htmlContent.match(/<ul|<ol/gi) || []).length;
            var tableCount = (htmlContent.match(/<table/gi) || []).length;

            // Get approximate character count (strip HTML)
            var textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
            var charCount = textContent.length;
            var wordCount = textContent ? textContent.split(/\s+/).length : 0;

            var summary = [];

            if (charCount > 0) {
                summary.push(`${wordCount} words (~${charCount} characters)`);
            }

            if (imgCount > 0) summary.push(`${imgCount} image${imgCount > 1 ? 's' : ''}`);
            if (pCount > 0) summary.push(`${pCount} paragraph${pCount > 1 ? 's' : ''}`);
            if (linkCount > 0) summary.push(`${linkCount} link${linkCount > 1 ? 's' : ''}`);
            if (listCount > 0) summary.push(`${listCount} list${listCount > 1 ? 's' : ''}`);
            if (tableCount > 0) summary.push(`${tableCount} table${tableCount > 1 ? 's' : ''}`);
            if (divCount > 0) summary.push(`${divCount} div${divCount > 1 ? 's' : ''}`);

            return summary.length > 0 ? summary.join(', ') : 'Basic text content';
        }

        directive.compile = function () {
            return function (scope, element) {
                if (scope.model && (scope.model.view === "textbox" || scope.model.view === "textarea" || scope.model.view === "rte")) {

                    $http.get("/umbraco/backoffice/lastvalues/MiniRollbackApi/IsEnabled", { umbIgnoreErrors: true  // This tells Umbraco to NOT show error notifications
                    }).then(response => {
                        var isEnabled = response.data;

                        if (!isEnabled) {
                            return; // Skip if disabled
                        }

                        setTimeout(() => {
                            var input = element.find("input, textarea");

                            if (input.length > 0 && !element.find(".mini-rollback-icon").length) {
                                var alias = scope.model.alias;
                                var nodeId = window.location.href.match(/\/edit\/(\d+)/)[1] || "Unknown";

                                // Get the closest umb-property to extract element-key
                                var umbProperty = element.closest("umb-property");
                                var elementKey = umbProperty ? umbProperty.attr("element-key") : null;

                                var icon = angular.element('<i class="icon icon-time mini-rollback-icon" title="View previous values"></i>');

                                // Enhanced hover effect
                                icon.on('mouseenter', function () {
                                    angular.element(this).addClass('mini-rollback-icon-hover');
                                });

                                icon.on('mouseleave', function () {
                                    angular.element(this).removeClass('mini-rollback-icon-hover');
                                });

                                icon.on("click", function (event) {
                                    // Prevent the default action and stop event propagation
                                    event.preventDefault();
                                    event.stopPropagation();

                                    // Prevent multiple clicks while loading
                                    if (icon.attr("disabled")) {
                                        return;
                                    }
                                    icon.attr("disabled", "disabled"); // Disable the icon

                                    // Show loader while fetching data
                                    var loader = angular.element('<div class="mini-rollback-loader">Loading...</div>');
                                    element.append(loader);

                                    var url = "/umbraco/backoffice/lastvalues/MiniRollbackApi/GetLastValue?nodeId=" + nodeId + "&alias=" + alias;
                                    if (elementKey) {
                                        url += "&elementKey=" + elementKey;
                                    }

                                    $http.get(url, {
                                        umbIgnoreErrors: true  // This tells Umbraco to NOT show error notifications
                                    }).then(response => {
                                        // Get current value for comparison
                                        var currentValue = input.val() || '';
                                        var isRte = scope.model.view === "rte";

                                        var valuesHtml = response.data.values.map((val, index) => {
                                            var valueToCompare = val.Value || '';
                                            var displayValue = valueToCompare;
                                            var diffClass = '';
                                            var diffLegend = '';
                                            var versionLabel = '';
                                            var selectionClass = isRte ? 'mini-rollback-no-select' : 'mini-rollback-selectable';
                                            var copyButtonHtml = '';
                                            var previewHtml = '';

                                            // Process content based on type
                                            var processedContent, cleanText, formattedHtml;

                                            if (isRte) {
                                                formattedHtml = getFormattedHtmlFromRte(valueToCompare);
                                                cleanText = getCleanTextFromRte(valueToCompare);
                                                processedContent = formattedHtml;
                                            } else {
                                                processedContent = valueToCompare;
                                                cleanText = valueToCompare;
                                                formattedHtml = valueToCompare;
                                            }

                                            // For RTE, create copy controls and preview
                                            if (isRte) {
                                                var isTruncated = false;
                                                var displayHtml = formattedHtml;
                                                if (formattedHtml.length > 800) {
                                                    displayHtml = formattedHtml.substring(0, 800) + '...';
                                                    isTruncated = true;
                                                }

                                                var copyId = 'mini_rollback_copy_' + Date.now() + '_' + index;
                                                copyButtonHtml = `
                    <div class="mini-rollback-rte-controls">
                        <button type="button" class="mini-rollback-btn-copy-html" onclick="copyRteContent('${copyId}', 'html')" title="Copy HTML code">
                            <i class="icon icon-code"></i> Copy HTML
                        </button>
                        ${isTruncated ? `<button type="button" class="mini-rollback-btn-view-full" onclick="viewFullHtml('${copyId}')" title="View complete HTML"><i class="icon icon-zoom"></i> View Full</button>` : ''}
                    </div>
                    <div class="mini-rollback-rte-instruction">
                        <i class="icon icon-info"></i>
                        <strong>To restore:</strong> Copy the HTML above, then paste it in the RTE's HTML source view (HTML button in RTE toolbar)
                    </div>
                    <textarea id="${copyId}" style="display: none;">${escapeHtml(formattedHtml)}</textarea>
                `;

                                                var contentSummary = getContentSummary(formattedHtml);
                                                previewHtml = `
                    <div class="mini-rollback-rte-summary-section">
                        <div class="mini-rollback-rte-summary-label">Content Summary:</div>
                        <div class="mini-rollback-rte-summary">${contentSummary}</div>
                    </div>
                `;
                                            } else {
                                                // For non-RTE, show selection instruction
                                                copyButtonHtml = `
                    <div class="mini-rollback-text-instruction">
                        <i class="icon icon-info"></i>
                        <strong>To restore:</strong> Click this box to restore the value to your field
                    </div>
                `;
                                            }

                                            // Version labeling and diff logic
                                            var originalText = isRte ? formattedHtml : processedContent;
                                            var originalCleanText = isRte ? cleanText : processedContent;
                                            var diffHtml = '';
                                            var shouldShowDiff = false;

                                            if (index === 0) {
                                                // Current version
                                                diffClass = 'mini-rollback-current-version';
                                                diffLegend = isRte ? 'This is your current saved RTE version' : 'This is your current saved version';
                                                versionLabel = '<span class="mini-rollback-version-label mini-rollback-current-saved">Current Saved Version</span>';

                                                // Show appropriate content based on RTE type
                                                if (isRte) {
                                                    displayValue = escapeHtml(originalText);
                                                } else {
                                                    displayValue = escapeHtml(originalText);
                                                }
                                            } else {
                                                // Historical versions
                                                var newerValue = response.data.values[index - 1].Value || '';
                                                var newerProcessedContent, newerCleanText;

                                                if (isRte) {
                                                    newerProcessedContent = getFormattedHtmlFromRte(newerValue);
                                                    newerCleanText = getCleanTextFromRte(newerValue);
                                                } else {
                                                    newerProcessedContent = newerValue;
                                                    newerCleanText = newerValue;
                                                }

                                                if (isRte) {
                                                    diffClass = 'mini-rollback-diff-with-next mini-rollback-rte-diff';
                                                    diffLegend = 'RTE HTML changes to reach the next version (red = remove, green = add)';
                                                } else {
                                                    diffClass = 'mini-rollback-diff-with-next';
                                                    diffLegend = 'Changes needed to reach the next version (red = remove, green = add)';
                                                }

                                                versionLabel = `<span class="mini-rollback-version-label mini-rollback-historical">Version ${response.data.values.length - index}</span>`;

                                                // Create the diff HTML
                                                diffHtml = createRteCodeDiff(originalText, newerProcessedContent, isRte);
                                                shouldShowDiff = true;

                                                // Start with diff view enabled by default
                                                displayValue = diffHtml;
                                            }

                                            // Create unique IDs for this value option
                                            var optionId = 'mini_rollback_option_' + Date.now() + '_' + index;

                                            return `<div class="mini-rollback-value-option ${diffClass} ${selectionClass}" 
                      id="${optionId}"
                      data-is-rte="${isRte}" 
                      data-original-value="${escapeHtml(valueToCompare)}"
                      data-has-diff="${shouldShowDiff}">
            <div class="mini-rollback-version-info">
                ${versionLabel}
                <div class="mini-rollback-diff-legend">${diffLegend}</div>
            </div>
            ${copyButtonHtml}
            ${previewHtml}
            <div class="mini-rollback-value-text ${isRte ? 'mini-rollback-rte-html-code' : ''}">${displayValue}</div>
            <div class="mini-rollback-value-date">${val.Updated}</div>
            
            <!-- Hidden storage for original and diff text -->
            <script type="application/json" class="mini-rollback-original-text-data">${JSON.stringify(originalText)}</script>
            <script type="application/json" class="mini-rollback-original-clean-data">${JSON.stringify(originalCleanText)}</script>
            <script type="application/json" class="mini-rollback-diff-html-data">${JSON.stringify(diffHtml)}</script>
            <script type="application/json" class="mini-rollback-original-full-data">${JSON.stringify(valueToCompare)}</script>
        </div>`;
                                        }).join('');

                                        // Create a container for the modal that's fixed to the viewport
                                        var modalContainer = angular.element(`<div class="mini-rollback-modal-container"></div>`);

                                        var popup = angular.element(`
                                                <div class="mini-rollback-modal">
                                                    <div class="mini-rollback-modal-header">
                                                        <h4>Previous Values - ${scope.model.label || alias} ${isRte ? '(HTML View)' : ''}</h4>
                                                        <div class="mini-rollback-modal-controls">
                                                            <button type="button" class="mini-rollback-btn mini-rollback-btn-toggle-diff" title="Toggle Diff View">
                                                                <i class="icon icon-eye"></i>
                                                            </button>
                                                            <button type="button" class="mini-rollback-btn mini-rollback-btn-maximize" title="Maximize">
                                                                <i class="icon icon-out"></i>
                                                            </button>
                                                            <button type="button" class="mini-rollback-btn mini-rollback-btn-close" title="Close">
                                                                <i class="icon icon-delete"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div class="mini-rollback-diff-legend-header">
                                                        <span class="mini-rollback-legend-item">
                                                            <span class="mini-rollback-diff-removed-sample">Removed text</span> | 
                                                            <span class="mini-rollback-diff-added-sample">Added text</span>
                                                            <span style="margin-left: 15px; font-size: 11px; color: #666;">
                                                                (Shows changes made to reach the next chronological version)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div class="values-container">${valuesHtml}</div>
                                                    <div class="resizer-e"></div>
                                                    <div class="resizer-s"></div>
                                                    <div class="resizer-se"></div>
                                                </div>`);

                                        // Update the style definitions to ensure they apply in fullscreen mode too
                                        var styleElement = angular.element(`
                                                                    <style>
                                                                        .last-value-modal-container {
                                                                            position: fixed;
                                                                            top: 0;
                                                                            left: 0;
                                                                            width: 100%;
                                                                            height: 100%;
                                                                            background: rgba(0,0,0,0.3);
                                                                            z-index: 10000;
                                                                            display: flex;
                                                                            justify-content: center;
                                                                            align-items: center;
                                                                            pointer-events: none;
                                                                        }
                                                                        .last-value-modal {
                                                                            position: absolute;
                                                                            width: 500px;
                                                                            height: 400px;
                                                                            background: white;
                                                                            border: 1px solid #ccc;
                                                                            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                                                                            z-index: 10001;
                                                                            overflow: hidden;
                                                                            display: flex;
                                                                            flex-direction: column;
                                                                            transition: all 0.3s ease;
                                                                            pointer-events: auto;
                                                                            border-radius: 3px;
                                                                        }
                                                                        .modal-header {
                                                                            display: flex;
                                                                            justify-content: space-between;
                                                                            align-items: center;
                                                                            padding: 10px 15px;
                                                                            background: #f8f8f8;
                                                                            border-bottom: 1px solid #eee;
                                                                            min-height: 44px;
                                                                        }
                                                                        .modal-controls {
                                                                            display: flex;
                                                                        }
                                                                        .modal-controls button {
                                                                            margin-left: 8px;
                                                                            background: none;
                                                                            border: none;
                                                                            cursor: pointer;
                                                                            padding: 5px;
                                                                            width: 30px;
                                                                            height: 30px;
                                                                            border-radius: 3px;
                                                                            display: flex;
                                                                            align-items: center;
                                                                            justify-content: center;
                                                                            transition: all 0.2s ease;
                                                                        }
                                                                        .modal-controls button:hover {
                                                                            background: #eeeeee;
                                                                        }
                                                                        .modal-controls button:focus {
                                                                            outline: none;
                                                                        }
                                                                        .modal-controls button.btn-maximize {
                                                                            color: #2bc37c; /* Umbraco green color */
                                                                        }
                                                                        .modal-controls button.btn-close {
                                                                            color: #d42054; /* Umbraco red color */
                                                                        }
                                                                        .modal-controls button i {
                                                                            font-size: 16px;
                                                                        }
                                                                        .modal-header h4 {
                                                                            margin: 0;
                                                                            font-size: 16px;
                                                                            font-weight: 500;
                                                                            color: #1b264f; /* Umbraco dark blue color */
                                                                        }
                                                                        .values-container {
                                                                            flex: 1;
                                                                            overflow-y: auto;
                                                                            padding: 15px;
                                                                        }
                                                                        .value-option {
                                                                            padding: 12px;
                                                                            border: 1px solid #eee;
                                                                            border-radius: 3px;
                                                                            margin-bottom: 10px;
                                                                            cursor: pointer;
                                                                            transition: background 0.2s;
                                                                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                                                                        }
                                                                        .value-option:hover {
                                                                            background: #f5f5f5;
                                                                            border-color: #ddd;
                                                                        }
                                                                        .value-text {
                                                                            word-break: break-word;
                                                                        }
                                                                        .value-date {
                                                                            font-size: 11px;
                                                                            color: #999;
                                                                            margin-top: 4px;
                                                                        }
                                                                        .last-value-modal.fullscreen {
                                                                            position: fixed !important;
                                                                            width: 90% !important;
                                                                            height: 80% !important;
                                                                            top: 10% !important;
                                                                            left: 5% !important;
                                                                            transform: none !important;
                                                                            max-height: 80vh !important;
                                                                            border-radius: 4px;
                                                                            /* Keep all base styles in fullscreen mode */
                                                                            background: white !important;
                                                                            border: 1px solid #ccc !important;
                                                                            box-shadow: 0 4px 8px rgba(0,0,0,0.2) !important;
                                                                            z-index: 10001 !important;
                                                                            overflow: hidden !important;
                                                                            display: flex !important;
                                                                            flex-direction: column !important;
                                                                        }
                                                                        .last-value-modal.fullscreen .values-container {
                                                                            max-height: calc(80vh - 60px) !important;
                                                                            height: auto !important;
                                                                            flex: 1 !important;
                                                                            overflow-y: auto !important;
                                                                            padding: 15px !important;
                                                                        }
                                                                        .last-value-modal.fullscreen .modal-header {
                                                                            background: #f8f8f8 !important;
                                                                            border-bottom: 1px solid #eee !important;
                                                                            min-height: 44px !important;
                                                                        }
                                                                        .last-value-modal.fullscreen .value-option {
                                                                            padding: 12px !important;
                                                                            border: 1px solid #eee !important;
                                                                            border-radius: 3px !important;
                                                                            margin-bottom: 10px !important;
                                                                            cursor: pointer !important;
                                                                            box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                                                                        }
                                                                        .last-value-modal.fullscreen .value-option:hover {
                                                                            background: #f5f5f5 !important;
                                                                            border-color: #ddd !important;
                                                                        }
                                                                        .resizer-e, .resizer-s, .resizer-se {
                                                                            position: absolute;
                                                                        }
                                                                        .resizer-e {
                                                                            right: 0;
                                                                            top: 0;
                                                                            width: 5px;
                                                                            height: 100%;
                                                                            cursor: e-resize;
                                                                        }
                                                                        .resizer-s {
                                                                            bottom: 0;
                                                                            left: 0;
                                                                            height: 5px;
                                                                            width: 100%;
                                                                            cursor: s-resize;
                                                                        }
                                                                        .resizer-se {
                                                                            right: 0;
                                                                            bottom: 0;
                                                                            width: 10px;
                                                                            height: 10px;
                                                                            cursor: se-resize;
                                                                        }
                                                                        .loader {
                                                                            position: absolute;
                                                                            top: 0;
                                                                            left: 0;
                                                                            width: 100%;
                                                                            height: 100%;
                                                                            background: rgba(255,255,255,0.8);
                                                                            display: flex;
                                                                            justify-content: center;
                                                                            align-items: center;
                                                                            z-index: 9999;
                                                                        }
                                                                        /* Custom icon style to match Umbraco */
                                                                        .custom-icon {
                                                                            color: #1b264f;
                                                                            font-size: 16px;
                                                                            transition: color 0.2s;
                                                                        }
                                                                        .custom-icon:hover {
                                                                            color: #2bc37c;
                                                                        }
                                                                    </style>
                                                                    `);

                                        // Compile and append elements
                                        $compile(modalContainer)(icon.scope());
                                        $compile(popup)(icon.scope());

                                        // Add to DOM
                                        angular.element(document.body).append(styleElement);
                                        angular.element(document.body).append(modalContainer);
                                        modalContainer.append(popup);

                                        // Remove loader once data is loaded
                                        loader.remove();
                                        icon.removeAttr("disabled"); // Re-enable the icon

                                        // Center the popup initially
                                        popup.css({
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)'
                                        });

                                        // Track fullscreen and diff state
                                        var isFullscreen = false;
                                        var isDiffEnabled = true;
                                        var originalStyles = {
                                            width: popup.css('width'),
                                            height: popup.css('height'),
                                            top: popup.css('top'),
                                            left: popup.css('left'),
                                            transform: popup.css('transform')
                                        };

                                        // Maximize button click event - prevent default to avoid form submission
                                        popup.find('button.btn-maximize').on('click', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            isDiffEnabled = !isDiffEnabled;

                                            if (isDiffEnabled) {
                                                // Show diff view
                                                popup.removeClass('mini-rollback-modal-diff-disabled');
                                                angular.element(this).find('i').removeClass('icon-block').addClass('icon-eye');
                                                angular.element(this).attr('title', 'Hide Diff View');

                                                // Show diff for ALL historical versions (including RTE)
                                                popup.find('.mini-rollback-value-option[data-has-diff="true"]').each(function () {
                                                    var elem = angular.element(this);
                                                    var diffDataScript = elem.find('.mini-rollback-diff-html-data');

                                                    if (diffDataScript.length > 0) {
                                                        try {
                                                            var diffHtml = JSON.parse(diffDataScript.text());
                                                            if (diffHtml && diffHtml.trim()) {
                                                                // Always show as HTML code (escaped) - never render
                                                                elem.find('.mini-rollback-value-text').html(diffHtml);
                                                            }
                                                        } catch (e) {
                                                            console.error('Error parsing diff data:', e);
                                                        }
                                                    }
                                                });

                                            } else {
                                                // Show clean view WITHOUT diff highlighting
                                                popup.addClass('mini-rollback-modal-diff-disabled');
                                                angular.element(this).find('i').removeClass('icon-eye').addClass('icon-block');
                                                angular.element(this).attr('title', 'Show Diff View');

                                                // Show appropriate content for all versions
                                                popup.find('.mini-rollback-value-option').each(function () {
                                                    var elem = angular.element(this);
                                                    var isRteItem = elem.attr('data-is-rte') === 'true';

                                                    if (isRteItem) {
                                                        // FIXED: For RTE, show HTML code (not clean text) even in non-diff view
                                                        var originalDataScript = elem.find('.mini-rollback-original-text-data');
                                                        if (originalDataScript.length > 0) {
                                                            try {
                                                                var originalHtmlCode = JSON.parse(originalDataScript.text());
                                                                // Show the HTML code without diff highlighting
                                                                elem.find('.mini-rollback-value-text').html(escapeHtml(originalHtmlCode || 'Empty content'));
                                                            } catch (e) {
                                                                console.error('Error parsing original HTML data:', e);
                                                            }
                                                        }
                                                    } else {
                                                        // For regular text, show original
                                                        var originalDataScript = elem.find('.mini-rollback-original-text-data');
                                                        if (originalDataScript.length > 0) {
                                                            try {
                                                                var originalText = JSON.parse(originalDataScript.text());
                                                                elem.find('.mini-rollback-value-text').html(escapeHtml(originalText));
                                                            } catch (e) {
                                                                console.error('Error parsing original data:', e);
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        });

                                        // Maximize button click event
                                        popup.find('button.mini-rollback-btn-maximize').on('click', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            isFullscreen = !isFullscreen;

                                            if (isFullscreen) {
                                                originalStyles = {
                                                    width: popup.css('width'),
                                                    height: popup.css('height'),
                                                    top: popup.css('top'),
                                                    left: popup.css('left'),
                                                    transform: popup.css('transform')
                                                };

                                                popup.addClass('mini-rollback-fullscreen');
                                                popup.css({
                                                    position: 'fixed',
                                                    width: '90%',
                                                    height: '80%',
                                                    maxHeight: '80vh',
                                                    top: '10%',
                                                    left: '5%',
                                                    transform: 'none',
                                                    background: 'white',
                                                    border: '1px solid #ccc',
                                                    borderRadius: '4px',
                                                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                                    zIndex: '10001',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    flexDirection: 'column'
                                                });

                                                // Ensure specific styling is maintained for child elements
                                                popup.find('.modal-header').css({
                                                    background: '#f8f8f8',
                                                    borderBottom: '1px solid #eee',
                                                    minHeight: '44px'
                                                });

                                                popup.find('.values-container').css({
                                                    maxHeight: 'calc(80vh - 60px)',
                                                    height: 'auto',
                                                    flex: '1',
                                                    overflowY: 'auto',
                                                    padding: '15px'
                                                });

                                                // Make sure button styles remain consistent
                                                popup.find('.modal-controls button.btn-maximize').css('color', '#2bc37c');
                                                popup.find('.modal-controls button.btn-close').css('color', '#d42054');

                                                // Update icon
                                                popup.find('.btn-maximize i').removeClass('icon-out').addClass('icon-window-popin');

                                                // Hide resizers in fullscreen mode
                                                popup.find('.resizer-e, .resizer-s, .resizer-se').hide();
                                            } else {
                                                popup.removeClass('mini-rollback-fullscreen');
                                                popup.find('.mini-rollback-btn-maximize i').removeClass('icon-window-popin').addClass('icon-out');
                                                popup.css(originalStyles);
                                                popup.find('.mini-rollback-resizer-e, .mini-rollback-resizer-s, .mini-rollback-resizer-se').show();
                                            }
                                        });

                                        // Setup resizing
                                        var resizers = popup.find('.mini-rollback-resizer-e, .mini-rollback-resizer-s, .mini-rollback-resizer-se');
                                        var isResizing = false;
                                        var currentResizer;

                                        resizers.on('mousedown', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            if (isFullscreen) return;

                                            isResizing = true;
                                            currentResizer = angular.element(this);
                                            var startX = e.clientX;
                                            var startY = e.clientY;
                                            var startWidth = parseInt(popup.css('width'), 10) || popup.width();
                                            var startHeight = parseInt(popup.css('height'), 10) || popup.height();

                                            currentResizer.data('startX', startX);
                                            currentResizer.data('startY', startY);
                                            currentResizer.data('startWidth', startWidth);
                                            currentResizer.data('startHeight', startHeight);
                                        });

                                        // Setup drag to move
                                        var isDragging = false;

                                        popup.find('.mini-rollback-modal-header').on('mousedown', function (e) {
                                            if (isFullscreen) return;
                                            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') return;

                                            e.preventDefault();
                                            e.stopPropagation();

                                            isDragging = true;
                                            var dragStartX = e.clientX;
                                            var dragStartY = e.clientY;

                                            var rect = popup[0].getBoundingClientRect();
                                            var initialLeft = rect.left;
                                            var initialTop = rect.top;

                                            popup.css({
                                                transform: 'none',
                                                top: initialTop + 'px',
                                                left: initialLeft + 'px'
                                            });

                                            popup.data('dragStartX', dragStartX);
                                            popup.data('dragStartY', dragStartY);
                                            popup.data('initialLeft', initialLeft);
                                            popup.data('initialTop', initialTop);
                                        });

                                        var documentMoveHandler = function (e) {
                                            e.preventDefault();

                                            if (isResizing) {
                                                var startX = currentResizer.data('startX');
                                                var startY = currentResizer.data('startY');
                                                var startWidth = currentResizer.data('startWidth');
                                                var startHeight = currentResizer.data('startHeight');

                                                if (currentResizer.hasClass('mini-rollback-resizer-e') || currentResizer.hasClass('mini-rollback-resizer-se')) {
                                                    var width = startWidth + (e.clientX - startX);
                                                    if (width > 300) popup.css('width', width + 'px');
                                                }

                                                if (currentResizer.hasClass('mini-rollback-resizer-s') || currentResizer.hasClass('mini-rollback-resizer-se')) {
                                                    var height = startHeight + (e.clientY - startY);
                                                    if (height > 200) popup.css('height', height + 'px');
                                                }
                                            }

                                            if (isDragging) {
                                                var dragStartX = popup.data('dragStartX');
                                                var dragStartY = popup.data('dragStartY');
                                                var initialLeft = popup.data('initialLeft');
                                                var initialTop = popup.data('initialTop');

                                                var newLeft = initialLeft + (e.clientX - dragStartX);
                                                var newTop = initialTop + (e.clientY - dragStartY);

                                                popup.css({
                                                    left: newLeft + 'px',
                                                    top: newTop + 'px'
                                                });
                                            }
                                        };

                                        var documentUpHandler = function (e) {
                                            isResizing = false;
                                            isDragging = false;
                                        };

                                        // Function to clean up all event listeners and remove elements
                                        function cleanup() {
                                            popup.remove();
                                            modalContainer.remove();
                                            angular.element(document).off('mousemove', documentMoveHandler);
                                            angular.element(document).off('mouseup', documentUpHandler);
                                        }

                                        // Click on modal background to close
                                        modalContainer.on('click', function (e) {
                                            if (e.target === modalContainer[0]) {
                                                cleanup();
                                            }
                                        });

                                        // Close button click event
                                        popup.find('button.mini-rollback-btn-close').on('click', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            cleanup();
                                        });

                                        // Value selection event - only for non-RTE elements
                                        popup.find('.mini-rollback-value-option.mini-rollback-selectable').on('click', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            var valueOption = angular.element(this);
                                            var isRte = valueOption.attr('data-is-rte') === "true";

                                            // Skip selection for RTE
                                            if (isRte) {
                                                return;
                                            }

                                            // Get the original value from JSON storage
                                            var originalDataScript = valueOption.find('.mini-rollback-original-full-data');
                                            if (originalDataScript.length > 0) {
                                                try {
                                                    var originalValue = JSON.parse(originalDataScript.text());
                                                    input.val(originalValue);
                                                    input.trigger('input');
                                                    cleanup();
                                                } catch (e) {
                                                    console.error('Error parsing original value for selection:', e);
                                                }
                                            }
                                        });

                                        // Add document event listeners
                                        angular.element(document).on('mousemove', documentMoveHandler);
                                        angular.element(document).on('mouseup', documentUpHandler);

                                        // Add keyboard support (ESC to close)
                                        angular.element(document).on('keydown', function (e) {
                                            if (e.keyCode === 27) { // ESC key
                                                cleanup();
                                            }
                                        });

                                    }).catch(() => {
                                        loader.remove();
                                        icon.removeAttr("disabled");
                                    });
                                });

                                // Icon placement strategy
                                var iconPlaced = false;

                                // Strategy 1: Place next to property label
                                var propertyLabel = element.closest('.umb-property').find('label[for], .umb-property-editor label').first();
                                if (propertyLabel.length > 0 && !iconPlaced) {
                                    propertyLabel.append(icon);
                                    iconPlaced = true;
                                }

                                // Strategy 2: Look for umb-property-editor header/label area
                                if (!iconPlaced) {
                                    var propertyEditor = element.closest('.umb-property-editor');
                                    var labelArea = propertyEditor.find('.umb-property-editor__label, .control-label').first();
                                    if (labelArea.length > 0) {
                                        labelArea.append(icon);
                                        iconPlaced = true;
                                    }
                                }

                                // Strategy 3: For block list/grid - look for the property title area
                                if (!iconPlaced) {
                                    var blockPropertyTitle = element.closest('[data-element]').find('.umb-block-list__content-title, .umb-block-grid__content-title');
                                    if (blockPropertyTitle.length > 0) {
                                        var blockIconContainer = angular.element('<span style="margin-left: 8px; display: inline-block;"></span>');
                                        blockIconContainer.append(icon);
                                        blockPropertyTitle.append(blockIconContainer);
                                        iconPlaced = true;
                                    }
                                }

                                // Strategy 4: Top-right corner of property container (fallback)
                                if (!iconPlaced) {
                                    var propertyContainer = element.closest('.umb-property, .umb-property-editor');
                                    if (propertyContainer.length > 0) {
                                        var cornerIcon = angular.element('<div style="position: absolute; top: 8px; right: 8px; z-index: 100;"></div>');
                                        cornerIcon.append(icon);
                                        propertyContainer.css('position', 'relative').append(cornerIcon);
                                        iconPlaced = true;
                                    }
                                }

                                // Strategy 5: Final fallback - after input
                                if (!iconPlaced) {
                                    input.after(icon);
                                    iconPlaced = true;
                                }
                            }
                        }, 500);
                    });
                }
                if (linkFn) linkFn.apply(this, arguments);
            };
        };

        return $delegate;
    });
});