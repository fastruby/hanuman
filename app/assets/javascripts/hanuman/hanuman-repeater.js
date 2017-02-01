$(document).ready(function(){

  uniquefyEntryIds()

  //  This removes the delete button from the first repeater.
  $('.destroy-form-container-repeater').first().hide()

  // need to find the max data entry on the page and start incrementing from there
  $dataEntry = 0;
  $('.form-container-repeater').each(function() {
    if ($dataEntry < $(this).attr('data-entry')) {
      $dataEntry = parseInt($(this).attr('data-entry'));
    }
  });

  // clicking on button to add repeater
  $('.form-container-survey').on("click", '.duplicate-form-container-repeater', function(e){
    e.preventDefault();
    e.stopPropagation();

    $scrollPosition = $(this).offset().top - 50;

    // unbinding events on plugins
    unbindChosenTypes();
    $('.datepicker').datepicker('destroy');
    // cloudinary events
    $.cleanData( $('input.cloudinary-fileupload[type=file]') );

    // find and clone container
    var container = $(this).closest('.form-container-repeater');
    $clonedContainer = container.clone(true);

    // remove hidden field observation ids
    $($clonedContainer).find('.hidden-field-observation-id').remove();
    // remove data-observation-id at the repeater level
    $($clonedContainer).removeAttr('data-observation-id')

    //************** BEGIN repeater ids
    repeaterInputs = $clonedContainer.find(".repeater-inputs")
    repeaterClosestPanel = $(this).parents(".panel-body")
    //************ END repeater ids

    // collect all container items inside cloned container for iteration later to update all attributes
    var containerItems = $($clonedContainer).find('.form-container-entry-item');

    // increment data-entry by 1 on every click
    $dataEntry = $dataEntry + 1;

    // loop through collected container items and update attributes with timestamps
    // CONTAINER ITEMS ARE RELATIVE TO CLONED CONTAINER, THINK OF CLONED CONTAINER AS A SECONDARY DOM OF ITS OWN.
    updateDom(containerItems, $dataEntry);

    // fix repeater container data-entry numbers
    $clonedContainer.attr("data-entry", $dataEntry);
    $clonedContainer.find(".form-container-repeater").attr("data-entry", $dataEntry);

    // set cloned container to display none for fading in
    $clonedContainer.attr("style", "display: none;").addClass("new-clone");
    // commenting out because we don't use fancy preview code for docs and videos, if we bring this back probably need this at this point
    cleartFilePreviewContainers($clonedContainer);

    // clear values
    clearValues($clonedContainer);

    // we need to stringiy and reset before appending to dom becuase without this, certain js events were getting
    // triggered on the current repeater as well as the repeater above it
    stringifyAndResetContainer($clonedContainer);
    $(container).after($clonedContainer);

    $newClone = $(".new-clone");

    $newClone.delay("100").fadeIn(1000).removeClass("new-clone");

    setTimeout(function() {
      $("html, body").animate({
        scrollTop: $scrollPosition
      }, 500);
    }, 200);

    // TODO: figure out how to fix the way we are doing our bind
    bindChosenTypes();

    // remove parsley classes and error messages on clonedContainer
    $clonedContainer.find('div.form-container-entry-item[data-required=true]').find('ul.parsley-errors-list').remove();
    removeErrorBackground('radio', $clonedContainer);
    removeErrorBackground('checkbox', $clonedContainer);
    removeErrorBackground('checkboxes', $clonedContainer);
    removeUserSuccessClass($clonedContainer);

    // bind maps
    setTimeout(function(){
      // setupDefaultMaps and bindButtons are in maps.js
      // TODO move maps.js into hanuman, make these method calls relative to the $clonedContainer
      setupDefaultMaps();
      bindButtons();
      resetMapButtons($clonedContainer);
    },500)

    // bind ConditionalLogic and re-run the logic to hide and show
    cl = new ConditionalLogic;
    cl.findRules();

    // unbind and rebind the pickers
    $(".datepicker").unbind().datepicker();
    $(".timepicki").unbind().timepicki({
      increase_direction: 'up',
      on_change: timepickValidate = function(element) {
        return $(element).parsley().validate();
      }
    });

    // rebind cloudinary
    if ($.fn.cloudinary_fileupload != undefined) {
      $('input.cloudinary-fileupload[type=file]').cloudinary_fileupload()
    }

    bindPhotoUploads()
    bindVideoUploads()
    bindDocumentUploads()


    // removed the pretty doc and video preview in cloudinary upload so commenting this out for now-kdh
    // binds previews
    // window.showVideoPreview();
    // window.documentPreview();
    // window.fileDeleteEvent();

    // resetting parsley required field styling on clonedContainer
    $clonedContainer.find('.parsley-error').removeClass('parsley-error')

    // shows delete button for new repeaters.
    $clonedContainer.find('.destroy-form-container-repeater').show()

    // on edit treat photo, video and doc sections as if new since on edit there is already saved files
    if ($('.survey-edit-mode').length > 0) {
      files = $clonedContainer.find("[data-element-type=file]").find('.custom-cloudinary li a')

      clearFileInputsValuesInEdit(files);

      // the code below is removing an unnecessary input placed in dom by carrierwave for every upload button. If we dont remove this input, we get an error when we submit the form.
      $clonedContainer.find('.file-upload-input-button input[type=hidden]').each(function(i, e){
        if ($(e).attr("name").slice(-4) == "[id]") {
          $(e).remove()
        }
      })

     }
     uniquefyEntryIds()
     UpdateIdsInRepeaters()
  });

  function uniquefyEntryIds() {
    entryId = 1
    nestedRepeaterCount = 0

    // finding and iterating through all the parent repeaters.
    $("[is-parent-repeater=true]").closest(".form-container-repeater").each(function(idx, el){

      // select all the containers that have entry id hidden inputs
      entryContainers = $(el).find('.form-container-entry-item')

      // find the entry id hidden inputs
      $entryInputs = entryContainers.find("input[name*='[entry]']")

      // update all entry inputs found on parent container.
      $entryInputs.val(entryId)

      // in the parent repeater, find all the nested repeater container
      nestedRepeater = $(el).find(".form-container-repeater")

      // then iterate through nested repeaters to update the entry ids with unique ids.
      nestedRepeaterIndex = entryId + 1
      nestedRepeater.each(function(i,el){
        if (i > 0) {
          entryInputWithinRepeaters = $(el).find("input[name*='[entry]']")
          entryInputWithinRepeaters.val(nestedRepeaterIndex)
          nestedRepeaterIndex += 1
        }
        // incrementing the count of nested repeaters for next loop to make use of
        nestedRepeaterCount += 1
      })
      // updating the entry id based on the nested repeater count
      entryId = nestedRepeaterCount + 1
    })

    // Keeping for future debbuging
    // $("input[name*='[entry]']").each(function(idx, el){
    //   $(el).after(" entry id: **** " + $(el).val())
    // })
  }

  function UpdateIdsInRepeaters(){
    //  Grabbing all the parent repeater containers
    parentRepeaters = $("input[is-parent-repeater=true]")
    parentRepeaterId = 1000

    // update all parent repeaters with unique id
    parentRepeaters.each(function(idx, el){
      $(el).val(parentRepeaterId)
      // $(el).after("updated parent repeater id: " + parentRepeaterId)
      parentRepeaterId += 1
    });

    // Grabbing all the children repeaters
    childrenRepeaters = $("input[nested-child=true")
    childrenRepeaterId = 1

    // update all childer repeaters with unique id
    childrenRepeaters.each(function(idx, el){
      if ($(el).attr('need-parent-repeater-id') == "true") {
        parentRepeaterContainerId = $(el).closest(".parent-repeater-container").find("input[is-parent-repeater=true]").val()
        $(el).val(parentRepeaterContainerId)
        $(el).after("updated parent repeater id: " + parentRepeaterContainerId)
      }else if ($(el).attr('repeater-id') == "true") {
        $(el).val(childrenRepeaterId)
        $(el).after("updated repeater id: " + childrenRepeaterId)
        childrenRepeaterId += 1
      }
    });
  };


  function clearFileInputsValuesInEdit(files){
    while (files.length >= 1) {
      $(files[0]).click();
      files = $clonedContainer.find("[data-element-type=file]").find('.custom-cloudinary li a')
    }
  }

  function cleartFilePreviewContainers(container){
    if ($('.survey-edit-mode').length > 0) {
      $($(container).find('.upload-view-mode')).empty();
      $(container).find(".photo-preview").empty()
      $(container).find(".video-preview").empty()
      $(container).find(".document-preview").empty()

    }else {
      $($(container).find('.photo-preview-container')).empty();
      $($(container).find('.video-preview-container')).empty();
      $($(container).find('.document-preview-container')).empty();


    }
  }

  function removeErrorBackground(type, $clonedContainer){
    $clonedContainer.find('div.form-container-entry-item[data-element-type='+ type +']').find('div.col-sm-7').removeAttr('style')
  }

  $('.form-container-survey').on('click', ".destroy-form-container-repeater", function(){
    var response = window.confirm('Are you sure you want to delete this observation?')
    var that = this;
    var entry = $($(this).closest('.form-container-repeater')).attr('data-entry');
    var dataObservationId = $($(this).closest('.form-container-repeater')).attr('data-observation-id');
    // if we have a dataObservationId then the observation has been saved to the DB, thus we need to delete from the DB otherwise just remove from the DOM
    if (response === true) {
      if (dataObservationId) {
        var projectId = window.location.pathname.match(/\/projects\/(\d+)/)[1];
        var surveyId = window.location.pathname.match(/\/surveys\/(\d+)/)[1];
        $.ajax({
          url: "/projects/" + projectId + "/hanuman/surveys/" + surveyId + "/repeater_observation/" + dataObservationId + "/entry/"+ entry,
          method: "Delete"
        }).done(function(response) {
          removeObservationFromDom(that, entry);
        });
      }else{
        removeObservationFromDom(that, entry);
      }
    }
    return false;
  });

  function removeObservationFromDom(observationContainerToDelete, entry) {
    $(".form-entry-item-container[data-entry=" + entry + "]").not('.form-entry-item-container[data-element-type=time]').remove();
    $removeContainer = $(observationContainerToDelete).closest('.form-container-repeater');

    setTimeout(function() {
      $("html, body").animate({
        scrollTop: $removeContainer.offset().top - 500
      }, 1000);
    }, 200);

    $removeContainer.fadeOut(
      2000,
      function() {
          $removeContainer.remove();
      }
    );
  }

  function resetMapButtons($clonedContainer){
    var map = $clonedContainer.find('div.form-container-entry-item[data-element-type=map] div.map-buttons')
    $(map).find('a.edit-map').text('Pin a Location on Map');
    $(map).find('a.edit-map').attr('style','display: inline-block;');
    $(map).find('a.cancel-map').attr('style','display: none;');
  };

  function removeUserSuccessClass($clonedContainer){
    var types = ['checkboxes', 'checkbox', 'radio']
    setTimeout(function(){
      types.forEach(function(type){
        $clonedContainer.find('div.form-container-entry-item[data-element-type=' + type + '] .col-sm-7 input').removeClass('user-success');
      })
    }, 2000)
  };

  function stringifyAndResetContainer(containerItems){
    for (var i = 0; i < containerItems.length; i++) {
      stringInput = $(containerItems[i]).prop('outerHTML');
      newInput = $.parseHTML(stringInput);
      $(containerItems[i]).replaceWith(newInput);
    }
  }

  function unbindChosenTypes(){
    $(".chosen-multiselect").chosen('destroy');
    $(".chosen-select").chosen('destroy');
    $(".bootstrap-checkbox-multiselect").multiselect('destroy');
  }

  function bindChosenTypes(){
    $(".chosen-multiselect").chosen();
    $(".chosen-select").chosen();
    $(".bootstrap-checkbox-multiselect").multiselect();
  }

  function updateClonedInputs($clonedRepeater, dataEntry, timeStamp){
    $($clonedRepeater).attr('data-entry', dataEntry);
    var inputs = $($clonedRepeater).find('input');
    var lastInputIndex = inputs.length - 1;
    var index = 0;
    $(inputs[lastInputIndex]).attr("value", dataEntry);
    var parsleySubstrig = Math.random().toString(36).substring(13);
    inputs.each(function(){
      // removing uploaded photos, docs and videos from $clonedContainer
      if ($(inputs[index]).attr('type') == 'file') {
        $(inputs[index]).siblings('.attachinary_container').last().remove()
      }
      if ($(inputs[index]).attr('id')) {
        var idStamp = $(inputs[index]).attr("id").match(/\d+/)[0];
        var newTimeStamp = idStamp.concat(timeStamp);
        $(inputs[index]).attr("id", $(inputs[index]).attr("id").replace(/\d+/, newTimeStamp));
      }
      if ($(inputs[index]).attr('name')) {
        if ($(inputs[index]).attr('name') != "file") {
          var nameStamp = $(inputs[index]).attr("name").match(/\d+/)[0];
          var newTimeStamp = nameStamp.concat(timeStamp);
          $(inputs[index]).attr("name", $(inputs[index]).attr("name").replace(/\d+/, newTimeStamp));
        }else if($(inputs[index]).attr("data-cloudinary-field")) {
          var nameStamp = $(inputs[index]).attr("data-cloudinary-field").match(/\d+/)[0];
          var newTimeStamp = nameStamp.concat(timeStamp);
          $(inputs[index]).attr("data-cloudinary-field", $(inputs[index]).attr("data-cloudinary-field").replace(/\d+/, newTimeStamp));
        }
      }
      if ($(inputs[index]).attr('data-parsley-multiple')) {
        var newTimeStamp = parsleySubstrig.concat(timeStamp);
        $(inputs[index]).attr("data-parsley-multiple", $(inputs[index]).attr("data-parsley-multiple").replace(/(\d+)/, newTimeStamp));
      }
      index ++;
    });
  };

  function updateClonedSelects($clonedRepeater, timeStamp){
    var select = $($clonedRepeater).find('select');
    var index = 0;
    select.each(function(){
      if ($(select[index]).attr('id')) {
        var idStamp = $(select[index]).attr("id").match(/\d+/)[0];
        var newTimeStamp = idStamp.concat(timeStamp);
        $(select[index]).attr("id", $(select[index]).attr("id").replace(/(\d+)/, newTimeStamp));
      }
      if ($(select[index]).attr('name')) {
        var nameStamp = $(select[index]).attr("name").match(/\d+/)[0];
        var newTimeStamp = nameStamp.concat(timeStamp);
        $(select[index]).attr("name", $(select[index]).attr("name").replace(/(\d+)/, newTimeStamp));
      }

      index ++;
    });
  }

  function updateClonedLabels($clonedRepeater, timeStamp){
    var labels = $($clonedRepeater).find('label');
    var index = 0;
    labels.each(function(){
      if ($(labels[index]).attr("for")) {
        var forStamp = $(labels[index]).attr("for").match(/\d+/)[0];
        var newTimeStamp = forStamp.concat(timeStamp);
        $(labels[index]).attr("for", $(labels[index]).attr("for").replace(/(\d+)/, newTimeStamp));
      }
      index ++
    });
  }

  function updateClonedTextareas($clonedRepeater, timeStamp){
    var textareas = $($clonedRepeater).find('textarea');
    var index = 0;
    textareas.each(function(){
      if ($(textareas[index]).attr('id')) {
        var idStamp = $(textareas[index]).attr("id").match(/\d+/)[0];
        var newTimeStamp = idStamp.concat(timeStamp);
        $(textareas[index]).attr("id", $(textareas[index]).attr("id").replace(/(\d+)/, newTimeStamp));
      }
      if ($(textareas[index]).attr('name')) {
        var nameStamp = $(textareas[index]).attr("name").match(/\d+/)[0];
        var newTimeStamp = nameStamp.concat(timeStamp);
        $(textareas[index]).attr("name", $(textareas[index]).attr("name").replace(/(\d+)/, newTimeStamp));
      }
      $(textareas[index]).val("");
      index ++;
    });
  }

  function updateDom(clonedRepeater, dataEntry){
    var timeStamp = new Date().getTime();
    for (var i = 0; i < clonedRepeater.length; i++) {
      $($(clonedRepeater[i]).find('.latlong')).attr('id', "map".concat(timeStamp));
      updateClonedInputs(clonedRepeater[i], dataEntry, timeStamp);
      updateClonedLabels(clonedRepeater[i], timeStamp);
      updateClonedSelects(clonedRepeater[i], timeStamp);
      updateClonedTextareas(clonedRepeater[i], timeStamp);
      $($(clonedRepeater[i]).find('.chosen-container')).attr("id", "survey_observations_attributes_" + timeStamp + "_answer_chosen");
      timeStamp = new Date().getTime();
    };
  };

  function clearValues(clonedRepeater){
    for (var i = 0; i < clonedRepeater.length; i++) {
      $(clonedRepeater[i]).find("input[type=date]").val("");
      $(clonedRepeater[i]).find("input[type=email]").val("");
      $(clonedRepeater[i]).find("input[type=number]").val("");
      $(clonedRepeater[i]).find("input[type=tel]").val("");
      $(clonedRepeater[i]).find("input[type=time]").val("");
      textFields = $(clonedRepeater[i]).find(":text").val("");
      textAreas = $(clonedRepeater[i]).find("textarea").val("");
      // un-select dropdown
      selects = $(clonedRepeater[i]).find("select");
      $(selects).each(function() {
        $(this).val("");

        // if we don't add please select at this point the dropdown will show blank with no prompt
        if ($(this).find('option:contains("Please select")').length < 1) {
          $(this).prepend("<option value>Please select</option>");
        }
        if ($(this).hasClass('chosen')) {
          $(this).trigger("chosen:updated");
        }
      });
      multiselects = $(clonedRepeater[i]).find("select[multiple]");
      $(multiselects).each(function() {
        $('#' + $(this).attr('id') + ' option:selected').removeAttr("selected");
        if ($(this).hasClass('chosen-multiselect')) {
          $(this).trigger("chosen:updated");
        }
      });
      // uncheck all checkboxes
      checkboxes = $(clonedRepeater[i]).find(":checkbox");
      $(checkboxes).each(function() {
        $(this).prop('checked', false);
        });
      // un-select radio buttons
      radiobuttons = $(clonedRepeater[i]).find(":radio");
      $(radiobuttons).each(function() {
        $(this).prop('checked', false);
      });

      // trigger onchange event which is needed for embedded conditional logic
      $(clonedRepeater[i]).find('.form-control').trigger('change');
    };
  };
});
