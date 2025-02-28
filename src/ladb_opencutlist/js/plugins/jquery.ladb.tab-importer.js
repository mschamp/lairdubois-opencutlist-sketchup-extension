+function ($) {
    'use strict';

    // CLASS DEFINITION
    // ======================

    var LadbTabImporter = function (element, options, opencutlist) {
        LadbAbstractTab.call(this, element, options, opencutlist);

        this.loadOptions = null;
        this.importablePartCount = 0;
        this.model_is_empty = false;

        this.$header = $('.ladb-header', this.$element);
        this.$fileTabs = $('.ladb-file-tabs', this.$header);
        this.$btnOpen = $('#ladb_btn_open', this.$header);
        this.$btnImport = $('#ladb_btn_import', this.$header);

        this.$panelHelp = $('.ladb-panel-help', this.$element);
        this.$page = $('.ladb-page', this.$element);

    };
    LadbTabImporter.prototype = new LadbAbstractTab;

    LadbTabImporter.DEFAULTS = {};

    LadbTabImporter.prototype.openCSV = function () {
        var that = this;

        rubyCallCommand('importer_open', null, function (response) {

            var i;

            if (response.errors.length > 0) {

                // Update filename
                that.$fileTabs.empty();

                // Hide help panel
                that.$panelHelp.hide();

                // Update page
                that.$page.empty();
                that.$page.append(Twig.twig({ ref: "tabs/importer/_list.twig" }).render({
                    errors: response.errors
                }));

                // Manage buttons
                that.$btnOpen.removeClass('btn-default');
                that.$btnOpen.addClass('btn-primary');
                that.$btnImport.hide();

                // Stick header
                that.stickSlideHeader(that.$rootSlide);

            }
            if (response.path) {

                var path = response.path;
                var filename = response.filename;
                var lengthUnit = response.length_unit;

                // Retrieve load options
                rubyCallCommand('core_get_model_preset', { dictionary: 'importer_load_options' }, function (response) {

                    var loadOptions = response.preset;

                    var $modal = that.appendModalInside('ladb_importer_modal_load', 'tabs/importer/_modal-load.twig', $.extend(loadOptions, {
                        path: path,
                        filename: filename,
                        lengthUnit: lengthUnit
                    }));

                    // Fetch UI elements
                    var $widgetPreset = $('.ladb-widget-preset', $modal);
                    var $selectColSep = $('#ladb_importer_load_select_col_sep', $modal);
                    var $selectFirstLineHeaders = $('#ladb_importer_load_select_first_line_headers', $modal);
                    var $btnLoad = $('#ladb_importer_load', $modal);

                    // Define useful functions
                    var fnFetchOptions = function (options) {
                        options.col_sep = $selectColSep.val();
                        options.first_line_headers = $selectFirstLineHeaders.val() === '1';
                    };
                    var fnFillInputs = function (options) {
                        $selectColSep.selectpicker('val', options.col_sep);
                        $selectFirstLineHeaders.selectpicker('val', options.first_line_headers ? '1' : '0');
                        loadOptions.column_mapping = options.column_mapping;
                    };

                    $widgetPreset.ladbWidgetPreset({
                        dialog: that.dialog,
                        dictionary: 'importer_load_options',
                        fnFetchOptions: fnFetchOptions,
                        fnFillInputs: fnFillInputs
                    });

                    // Bind select
                    $selectColSep.val(loadOptions.col_sep);
                    $selectColSep.selectpicker(SELECT_PICKER_OPTIONS);
                    $selectFirstLineHeaders.val(loadOptions.first_line_headers ? '1' : '0');
                    $selectFirstLineHeaders.selectpicker(SELECT_PICKER_OPTIONS);

                    // Bind buttons
                    $btnLoad.on('click', function () {

                        // Fetch options
                        fnFetchOptions(loadOptions);

                        that.loadCSV(loadOptions);

                        // Hide modal
                        $modal.modal('hide');

                    });

                    // Show modal
                    $modal.modal('show');

                });

            }

        });
    };

    LadbTabImporter.prototype.loadCSV = function (loadOptions) {
        var that = this;

        // Store options
        rubyCallCommand('core_set_model_preset', { dictionary: 'importer_load_options', values: loadOptions });

        rubyCallCommand('importer_load', loadOptions, function (response) {

            that.setObsolete(false);

            var i;

            if (response.path) {

                var errors = response.errors;
                var warnings = response.warnings;
                var filename = response.filename;
                var columns = response.columns;
                var parts = response.parts;
                var importablePartCount = response.importable_part_count;
                var model_is_empty = response.model_is_empty;
                var lengthUnit = response.length_unit;

                // Keep useful data
                that.loadOptions = loadOptions;
                that.importablePartCount = importablePartCount;
                that.model_is_empty = model_is_empty;

                // Update filename
                that.$fileTabs.empty();
                that.$fileTabs.append(Twig.twig({ ref: "tabs/importer/_file-tab.twig" }).render({
                    filename: filename,
                    importablePartCount: importablePartCount,
                    lengthUnit: lengthUnit
                }));

                // Hide help panel
                that.$panelHelp.hide();

                // Update page
                that.$page.empty();
                that.$page.append(Twig.twig({ ref: "tabs/importer/_list.twig" }).render({
                    errors: errors,
                    warnings: warnings,
                    columns: columns,
                    parts: parts,
                    importablePartCount: importablePartCount
                }));

                // Setup tooltips
                that.dialog.setupTooltips();

                // Apply column mapping
                for (i = 0; i < columns.length; i++) {
                    var $select = $('#ladb_select_column_' + i, that.$page);
                    $select
                        .val(columns[i].mapping)
                        .on('changed.bs.select', function(e, clickedIndex, isSelected, previousValue) {
                            var column = $(e.currentTarget).data('column');
                            var mapping = $(e.currentTarget).selectpicker('val');
                            for (var k in loadOptions.column_mapping) {
                                if (loadOptions.column_mapping[k] === column) {
                                    delete loadOptions.column_mapping[k];
                                }
                            }
                            if (mapping) {
                                loadOptions.column_mapping[mapping] = column;
                            }
                            that.loadCSV(loadOptions)
                        })
                        .selectpicker($.extend(SELECT_PICKER_OPTIONS, {
                            noneSelectedText: i18next.t('tab.import.column.unused')
                        }));
                }

                // Bind buttons
                $('.ladb-btn-setup-model-units', that.$header).on('click', function() {
                    $(this).blur();
                    that.dialog.executeCommandOnTab('settings', 'highlight_panel', { panel:'model' });
                });

                // Manage buttons
                that.$btnOpen.removeClass('btn-primary');
                that.$btnOpen.addClass('btn-default');
                that.$btnImport.show();
                that.$btnImport.prop( "disabled", importablePartCount === 0);

                // Stick header
                that.stickSlideHeader(that.$rootSlide);

            } else if (response.errors && response.errors.length > 0) {
                that.dialog.notifyErrors(response.errors);
            }

        });

    };

    LadbTabImporter.prototype.importParts = function () {
        var that = this;

        // Retrieve load option options
        rubyCallCommand('core_get_model_preset', { dictionary: 'importer_import_options' }, function (response) {

            var importOptions = response.preset;

            importOptions.remove_all = false;      // This option is not stored to force user to know the option status

            var $modal = that.appendModalInside('ladb_importer_modal_import', 'tabs/importer/_modal-import.twig', $.extend(importOptions, {
                importablePartCount: that.importablePartCount,
                model_is_empty: that.model_is_empty
            }));

            // Fetch UI elements
            var $widgetPreset = $('.ladb-widget-preset', $modal);
            var $selectRemoveAll = $('#ladb_importer_import_select_remove_all', $modal);
            var $inputKeepDefinitionsSettings = $('#ladb_importer_import_input_keep_definitions_settings', $modal);
            var $inputKeepMaterialsSettings = $('#ladb_importer_import_input_keep_materials_settings', $modal);
            var $btnImport = $('#ladb_importer_import', $modal);

            // Define useful functions
            var fnFetchOptions = function (options) {
                options.remove_all = $selectRemoveAll.selectpicker('val') === '1';
                options.keep_definitions_settings = $inputKeepDefinitionsSettings.prop('checked');
                options.keep_materials_settings = $inputKeepMaterialsSettings.prop('checked');
            };
            var fnFillInputs = function (options) {
                $selectRemoveAll.prop('val', options.remove_all ? '1' : '0');
                $inputKeepDefinitionsSettings.prop('checked', options.keep_definitions_settings);
                $inputKeepMaterialsSettings.prop('checked', options.keep_materials_settings);
            };

            $widgetPreset.ladbWidgetPreset({
                dialog: that.dialog,
                dictionary: 'importer_import_options',
                fnFetchOptions: fnFetchOptions,
                fnFillInputs: fnFillInputs
            });

            $inputKeepDefinitionsSettings.prop('checked', importOptions.keep_definitions_settings);
            $inputKeepMaterialsSettings.prop('checked', importOptions.keep_materials_settings);

            // Bind select
            $selectRemoveAll
                .on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
                    var removeAll = $(e.currentTarget).selectpicker('val');
                    if (removeAll === '1') {
                        $inputKeepDefinitionsSettings.closest('.form-group').show();
                    } else {
                        $inputKeepDefinitionsSettings.closest('.form-group').hide();
                    }
                })
                .selectpicker(SELECT_PICKER_OPTIONS);

            // Bind buttons
            $btnImport.on('click', function () {

                // Fetch options
                fnFetchOptions(importOptions);

                // Store options
                rubyCallCommand('core_set_model_preset', { dictionary: 'importer_import_options', values: importOptions });

                rubyCallCommand('importer_import', importOptions, function (response) {

                    var i;

                    if (response.errors.length > 0) {
                        that.dialog.notifyErrors(response.errors);
                    }
                    if (response.imported_part_count) {

                        // Update filename
                        that.$fileTabs.empty();

                        // Unstick header
                        that.unstickSlideHeader(that.$rootSlide);

                        // Update page
                        that.$page.empty();
                        that.$page.append(Twig.twig({ ref: "tabs/importer/_alert-success.twig" }).render({
                            importedPartCount: response.imported_part_count
                        }));

                        // Bind buttons
                        $('#ladb_importer_success_btn_see', that.$page).on('click', function() {
                            this.blur();
                            that.dialog.minimize();
                            rubyCallCommand('core_zoom_extents')
                        });
                        $('#ladb_importer_success_btn_cutlist', that.$page).on('click', function() {
                            this.blur();
                            that.dialog.executeCommandOnTab('cutlist', 'generate_cutlist');
                        });

                        // Manage buttons
                        that.$btnOpen.removeClass('btn-default');
                        that.$btnOpen.addClass('btn-primary');
                        that.$btnImport.hide();

                        // Cleanup keeped data
                        that.loadOptions = null;
                        that.importablePartCount = 0;
                        that.model_is_empty = false;

                    }

                });

                // Hide modal
                $modal.modal('hide');

            });

            // Show modal
            $modal.modal('show');

        });

    };

    // Internals /////

    LadbTabImporter.prototype.showObsolete = function (messageI18nKey, forced) {
        if (!this.isObsolete() || forced) {

            var that = this;

            // Set tab as obsolete
            this.setObsolete(true);

            var $modal = this.appendModalInside('ladb_importer_modal_obsolete', 'tabs/importer/_modal-obsolete.twig', {
                messageI18nKey: messageI18nKey
            });

            // Fetch UI elements
            var $btnLoad = $('#ladb_importer_obsolete_load', $modal);

            // Bind buttons
            $btnLoad.on('click', function () {
                $modal.modal('hide');
                that.loadCSV(that.loadOptions);
            });

            // Show modal
            $modal.modal('show');

        }
    };

    // Init /////

    LadbTabImporter.prototype.bind = function () {
        LadbAbstractTab.prototype.bind.call(this);

        var that = this;

        // Bind buttons
        this.$btnOpen.on('click', function () {
            that.openCSV();
            this.blur();
        });
        this.$btnImport.on('click', function () {
            that.importParts();
            this.blur();
        });

        // Events

        addEventCallback('on_options_provider_changed', function () {
            if (that.loadOptions) {
                that.showObsolete('core.event.options_change', true);
            }
        });

    };


    // PLUGIN DEFINITION
    // =======================

    function Plugin(option, params) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('ladb.tab.plugin');
            var options = $.extend({}, LadbTabImporter.DEFAULTS, $this.data(), typeof option === 'object' && option);

            if (!data) {
                if (undefined === options.dialog) {
                    throw 'dialog option is mandatory.';
                }
                $this.data('ladb.tab.plugin', (data = new LadbTabImporter(this, options, options.dialog)));
            }
            if (typeof option === 'string') {
                data[option].apply(data, Array.isArray(params) ? params : [ params ])
            } else {
                data.init(option.initializedCallback);
            }
        })
    }

    var old = $.fn.ladbTabImporter;

    $.fn.ladbTabImporter = Plugin;
    $.fn.ladbTabImporter.Constructor = LadbTabImporter;


    // NO CONFLICT
    // =================

    $.fn.ladbTabImporter.noConflict = function () {
        $.fn.ladbTabImporter = old;
        return this;
    }

}(jQuery);
