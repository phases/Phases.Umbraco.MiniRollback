angular.module("umbraco").config(function ($provide) {
    $provide.decorator("umbPropertyEditorDirective", function ($delegate, $http, $compile) {
        var directive = $delegate[0];
        var linkFn = directive.link;

        directive.compile = function () {
            return function (scope, element) {
                if (scope.model && (scope.model.view === "textbox" || scope.model.view === "textarea" || scope.model.view === "rte")) {

                    $http.get("/umbraco/backoffice/lastvalues/MiniRollbackApi/IsEnabled").then(response => {
                        var isEnabled = response.data;

                        if (!isEnabled) {
                            return; // Skip if disabled
                        }

                        setTimeout(() => {
                            var input = element.find("input, textarea");

                            if (input.length > 0 && !element.find(".custom-icon").length) {
                                var alias = scope.model.alias;
                                var nodeId = window.location.href.match(/\/edit\/(\d+)/)[1] || "Unknown";

                                // Get the closest umb-property to extract element-key
                                var umbProperty = element.closest("umb-property");
                                var elementKey = umbProperty ? umbProperty.attr("element-key") : null;

                                var icon = angular.element('<i class="icon icon-redo custom-icon" style="margin-left:5px; cursor:pointer;"></i>');

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
                                    var loader = angular.element('<div class="loader">Loading...</div>');
                                    element.append(loader);

                                    var url = "/umbraco/backoffice/lastvalues/MiniRollbackApi/GetLastValue?nodeId=" + nodeId + "&alias=" + alias;
                                    if (elementKey) {
                                        url += "&elementKey=" + elementKey;
                                    }

                                    $http.get(url).then(response => {
                                        var valuesHtml = response.data.values.map(val => {
                                            // Use different approach based on property type
                                            const isRte = scope.model.view === "rte";
                                            const valueDisplay = isRte
                                                ? `<div class="value-text rte-content">${val.Value}</div>`
                                                : `<div class="value-text">${val.Value}</div>`;

                                            return `<div class="value-option" data-is-rte="${isRte}">
                                                    ${valueDisplay}
                                                    <div class="value-date">${val.Updated}</div>
                                                </div>`;
                                        }).join('');

                                        // Create a container for the modal that's fixed to the viewport
                                        var modalContainer = angular.element(`<div class="last-value-modal-container"></div>`);

                                        var popup = angular.element(`
                                                <div class="last-value-modal">
                                                    <div class="modal-header">
                                                        <h4>Previous Values</h4>
                                                        <div class="modal-controls">
                                                            <button type="button" class="btn btn-maximize" title="Maximize">
                                                                <i class="icon icon-out"></i>
                                                            </button>
                                                            <button type="button" class="btn btn-close" title="Close">
                                                                <i class="icon icon-delete"></i>
                                                            </button>
                                                        </div>
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
                                        $compile(styleElement)(icon.scope());

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

                                        // Track fullscreen state
                                        var isFullscreen = false;
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

                                            isFullscreen = !isFullscreen;

                                            if (isFullscreen) {
                                                // Save current position and size before going fullscreen
                                                originalStyles = {
                                                    width: popup.css('width'),
                                                    height: popup.css('height'),
                                                    top: popup.css('top'),
                                                    left: popup.css('left'),
                                                    transform: popup.css('transform')
                                                };

                                                // Add fullscreen class first
                                                popup.addClass('fullscreen');

                                                // Then apply inline styles to ensure they override any conflicting styles
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
                                                // Exit fullscreen
                                                popup.removeClass('fullscreen');
                                                popup.find('.btn-maximize i').removeClass('icon-window-popin').addClass('icon-out');

                                                // Restore original size and position
                                                popup.css(originalStyles);

                                                // Reset specific styles that might have been overridden
                                                popup.find('.modal-header').css({
                                                    background: '#f8f8f8',
                                                    borderBottom: '1px solid #eee'
                                                });

                                                popup.find('.values-container').css({
                                                    maxHeight: '',
                                                    height: '',
                                                    flex: '1',
                                                    overflowY: 'auto',
                                                    padding: '15px'
                                                });

                                                // Show resizers again
                                                popup.find('.resizer-e, .resizer-s, .resizer-se').show();
                                            }
                                        });

                                        // Setup resizing
                                        var resizers = popup.find('.resizer-e, .resizer-s, .resizer-se');
                                        var isResizing = false;
                                        var startX, startY, startWidth, startHeight;
                                        var currentResizer;

                                        resizers.on('mousedown', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            if (isFullscreen) return; // Prevent resizing in fullscreen mode

                                            isResizing = true;
                                            currentResizer = angular.element(this);
                                            startX = e.clientX;
                                            startY = e.clientY;
                                            startWidth = parseInt(popup.css('width'), 10) || popup.width();
                                            startHeight = parseInt(popup.css('height'), 10) || popup.height();
                                        });

                                        // Setup drag to move
                                        var isDragging = false;
                                        var dragStartX, dragStartY, initialLeft, initialTop;

                                        popup.find('.modal-header').on('mousedown', function (e) {
                                            if (isFullscreen) return; // Prevent dragging in fullscreen mode
                                            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'I') return; // Don't drag from buttons

                                            e.preventDefault();
                                            e.stopPropagation();

                                            isDragging = true;
                                            dragStartX = e.clientX;
                                            dragStartY = e.clientY;

                                            // Reset transform and get accurate position
                                            var rect = popup[0].getBoundingClientRect();
                                            initialLeft = rect.left;
                                            initialTop = rect.top;

                                            popup.css({
                                                transform: 'none',
                                                top: initialTop + 'px',
                                                left: initialLeft + 'px'
                                            });
                                        });

                                        var documentMoveHandler = function (e) {
                                            e.preventDefault();

                                            if (isResizing) {
                                                // Resize based on which handle is being dragged
                                                if (currentResizer.hasClass('resizer-e') || currentResizer.hasClass('resizer-se')) {
                                                    var width = startWidth + (e.clientX - startX);
                                                    if (width > 300) popup.css('width', width + 'px');
                                                }

                                                if (currentResizer.hasClass('resizer-s') || currentResizer.hasClass('resizer-se')) {
                                                    var height = startHeight + (e.clientY - startY);
                                                    if (height > 200) popup.css('height', height + 'px');
                                                }
                                            }

                                            if (isDragging) {
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

                                        // Click on modal background to close
                                        modalContainer.on('click', function (e) {
                                            if (e.target === modalContainer[0]) {
                                                cleanup();
                                            }
                                        });

                                        // Close button click event
                                        popup.find('button.btn-close').on('click', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            cleanup();
                                        });

                                        // Value selection event
                                        popup.find('.value-option').on('click', function (e) {
                                            e.preventDefault();
                                            e.stopPropagation();

                                            var valueOption = angular.element(this);
                                            var isRte = valueOption.attr('data-is-rte') === "true";
                                            var selectedValue;

                                            if (isRte) {
                                                // For RTE, get the HTML content
                                                selectedValue = valueOption.find('.value-text').html();

                                                // Handle RTE format based on Umbraco version
                                                // Check if the current RTE value uses the JSON format
                                                var currentValue = input.val();
                                                var isJsonFormat = currentValue &&
                                                    currentValue.trim().startsWith('{') &&
                                                    currentValue.includes('"markup"');

                                                if (isJsonFormat) {
                                                    try {
                                                        // If current format is JSON, wrap the selected value in the same format
                                                        var currentJson = JSON.parse(currentValue);
                                                        var updatedJson = Object.assign({}, currentJson);
                                                        updatedJson.markup = selectedValue;
                                                        selectedValue = JSON.stringify(updatedJson);
                                                    } catch (e) {
                                                        // If parsing fails, use the HTML directly
                                                    }
                                                }
                                            } else {
                                                // For regular textbox/textarea, get just the text
                                                selectedValue = valueOption.find('.value-text').text();
                                            }

                                            input.val(selectedValue);
                                            input.trigger('input');
                                            cleanup();
                                        });

                                        // Function to clean up all event listeners and remove elements
                                        function cleanup() {
                                            popup.remove();
                                            modalContainer.remove();
                                            styleElement.remove();
                                            angular.element(document).off('mousemove', documentMoveHandler);
                                            angular.element(document).off('mouseup', documentUpHandler);
                                        }

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
                                        loader.remove(); // Remove loader on error
                                        icon.removeAttr("disabled"); // Re-enable icon even if API fails
                                    });
                                });

                                if (scope.model.view === "rte") {
                                    input.each(function () {
                                        if (this.name && this.name.startsWith("rTE") && this.type == "hidden") {
                                            input[0].parentElement.after(icon[0])
                                        }
                                    });
                                }
                                else {
                                    input.after(icon);
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