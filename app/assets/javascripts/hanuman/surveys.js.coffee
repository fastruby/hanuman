# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://coffeescript.org/

$ ->
  # webshim lib polyfill
  # html5 fallback support for form fields
  webshims.polyfill()
  
  # TYPEAHEAD

  if $(".typeahead").length > 0
    # instantiate bloodhound engine
    engine = new Bloodhound(
      name: "taxonomy"
      remote: "/hanuman/answer_choices.json?question_id=7"
      datumTokenizer: (d) ->
        Bloodhound.tokenizers.whitespace d.val

      queryTokenizer: Bloodhound.tokenizers.whitespace
    )

    # typeahead - initialize the bloodhound suggestion engine
    promise = engine.initialize()

    promise
    .done ->
      console.log 'success!'
    .fail ->
      console.log 'err!'

    # typeahead - instantiate the typeahead ui
    $(".typeahead").typeahead(
      hint: true
      highlight: true
      minLength: 1
    ,
      name: "taxanomy"
      displayKey: "option_text"
      source: engine.ttAdapter()
    )

  # END TYPEAHEAD


  # CHOSEN
  $(".chosen-select").chosen
    no_results_text: "No results matched"
    size: "100%"

  # chosen multiselect
  $(".chosen-multiselect").chosen
    allow_single_deselect: true
    no_results_text: "No results matched"
    size: "100%"

  # END CHOSEN


  # AJAX UPDATE FROM STEP_2
  $('.ajax-submit').on 'click', (e) ->
    e.preventDefault()
    $form = $('form')
    survey_id = $('#survey_id').val()
    $.ajax(
      type:     "PUT"
      url:      "/hanuman/surveys/" + survey_id,
      data:     $form.serialize(),
      dataType: "json",
      success: (response) ->
        # clear previous entry highlighting
        $('.panel-body.bg-success').removeClass('bg-success')
        $('.form-group.bg-success').removeClass('bg-success')
        
        # determine response count
        $responseCount = response.length
        
        # if we have more than one response object
        if $responseCount > 1
          # create a collapsible panel
          panel = HandlebarsTemplates['hanuman/templates/survey/panel'](response[0])
          # check to see if any panels already exist
          if $(".panel-collapse").length > 0
            # hide all existing panels
            $('.panel-collapse').collapse()
            # create next panel after last existing panel
            $(panel).insertAfter($(".panel").last())
          else
            # create first panel after last static row
            $(panel).insertAfter($('.form-control-static').last().closest('.form-group'))

          # add observation to end of observation section
          for observation in response
            do (observation) ->
              # check for collapsible panel presense
              if $(".panel-collapse").length > 0
                # if so render observation template inside last collapsible panel
                newRow = HandlebarsTemplates['hanuman/templates/survey/observation'](observation)
                $('.panel-body').last().append(newRow)
              else
                # if not render observation template after the last static row
                newRow = HandlebarsTemplates['hanuman/templates/survey/observation'](observation)
                $(newRow).insertAfter($('.form-control-static').last().closest('.form-group'))
        else
          # add observation to end of the last collapsible panel or form group with a form control static
          for observation in response
            do (observation) ->
              newRow = HandlebarsTemplates['hanuman/templates/survey/observation'](observation)
              $(newRow).insertAfter($('.panel, .form-control-static').not('.panel .form-control-static').last().closest('.panel, .form-group'))

        # clear out observation field(s)
        $('input[type!=hidden][type!=radio][type!=submit]').val("")
        $('input[type=radio]').attr('checked', false)
        $('select[multiple!=multiple]').each ->
          this.selectedIndex = 0
        $('.search-choice-close').click()

        # increment group value(s)
        $group = $('input[type=hidden][name*=\\[group\\]]')
        groupVal = parseInt $($group[0]).val()
        $group.val(groupVal + 1)

    ).fail (jqXHR, textStatus, errorThrown) ->
      errorRow = HandlebarsTemplates['hanuman/templates/survey/error'](errorThrown)
      $(errorRow).insertAfter($('.form-control-static').last().closest('.form-group'))
      # todo add honeybadger notification
    
  # hide all collapsible panels at start of step_2 and step_3
  if $('form[action*=\\/hanuman\\/survey_steps\\/step_2], form[action*=\\/hanuman\\/survey_steps\\/step_3]').length > 0
    if $(".panel-collapse").length > 0
      # hide all existing panels
      $('.panel-collapse').collapse()