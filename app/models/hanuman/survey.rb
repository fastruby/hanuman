module Hanuman
  class Survey < ActiveRecord::Base
    has_paper_trail
    belongs_to :survey_template
    has_many :observations, dependent: :destroy
    has_many :observation_answers, through: :observations
    accepts_nested_attributes_for :observations, :allow_destroy => true#, reject_if: lambda {|attributes| attributes['answer'].blank?}
    has_one :survey_extension, dependent: :destroy
    accepts_nested_attributes_for :survey_extension, :allow_destroy => true
    validates :survey_template_id, presence: true

    before_save :apply_group_sort

    amoeba do
      enable
    end

    def survey_steps
      self.survey_template.survey_steps.collect(&:step).uniq
    end

    def survey_step_is_duplicator?(step)
      self.survey_template.survey_steps.by_step(step).first.duplicator
    end

    def observation_entries_by_step(step)
      self.observations.filtered_by_step(step).collect(&:entry).uniq
    end

    def max_observation_entry_by_step(step)
      max = self.observations.filtered_by_step(step).collect(&:entry).uniq.max
      max.blank? ? 0 : max
    end

    def author
      self.versions.first.whodunnit unless self.versions.blank? rescue nil
    end

    def survey_step_has_observations?(step)
      survey_id = self.id
      if self.survey_template.survey_steps.where(step: step).first.questions.first.observations.where('hanuman_observations.survey_id = ?', survey_id).count > 0
        true
      else
        false
      end
    end

    private

      def apply_group_sort

        debug = false

        form_container_type = []
        form_container_label = []
        form_container_nesting_level = -1
        remaining_children = []
        last_child_id = []
        group = [0]
        sort = [0]

        self.observations.each do |o|
          if o.entry == 1
            if debug
              apply_group_sort_debug(o, 1, form_container_type, form_container_label, form_container_nesting_level, remaining_children, last_child_id, group, sort)
            end

            remaining_children[form_container_nesting_level] = remaining_children[form_container_nesting_level] - 1 unless remaining_children[form_container_nesting_level].blank?

            if o.question.answer_type.element_type == "container"
              form_container_nesting_level += 1
              form_container_type << o.question.answer_type.name
              form_container_label << o.question.question_text
              if o.question.children.blank?
                remaining_children << 0
              else
                remaining_children << o.question.children.length
                last_child_id << o.question.children.order(:sort_order).last.id
              end
              group << 0
              sort << 0
            end

            group_sort = ""

            (1..(form_container_nesting_level + 2)).each_with_index do |n, index|
              group_sort += (index == 0 ? "g" : "-g") + group[index].to_s.rjust(3, '0') + ":s" + sort[index].to_s.rjust(3, '0')
            end

            o.group_sort = group_sort

            if debug
              puts group_sort
              puts o.inspect
            end

            if remaining_children[form_container_nesting_level] == 0 || o.question.id == last_child_id[form_container_nesting_level]
              form_container_nesting_level -= 1
              form_container_type.pop
              form_container_label.pop
              remaining_children.pop
              last_child_id.pop

              if debug
                apply_group_sort_debug(o, 2, form_container_type, form_container_label, form_container_nesting_level, remaining_children, last_child_id, group, sort)
              end

              remaining_children.each do |rc|
                if rc == 0
                  form_container_nesting_level -= 1
                  form_container_type.pop
                  form_container_label.pop
                  remaining_children.pop
                  last_child_id.pop
                end

                if debug
                  apply_group_sort_debug(o, 2, form_container_type, form_container_label, form_container_nesting_level, remaining_children, last_child_id, group, sort)
                end

              end
            end

            sort[form_container_nesting_level + 1] += 1
          end
        end
        # figure out how to loop through remaining entries, will need to determine the max entry number to invoke a loop

        depth = 0
        group = []
        sort = []
        last_entry = 0

        self.observations.each do |o|
          if o.entry > last_entry
            last_entry = o.entry
          end
        end

        (2..(last_entry)).each do |n|
          self.observations.each do |o|
            if o.entry == n
              # find matching question id from entry 1 observations
              self.observations.each do |sub_o|
                if sub_o.entry == 1 and sub_o.question_id == o.question_id

                  # we have a matching question id
                  # grab group_sort from matching observation and parse
                  puts sub_o.group_sort.to_s
                  parsed_group_sort = sub_o.group_sort.split("-")
                  puts parsed_group_sort.to_s
                  depth = parsed_group_sort.count
                  puts depth.to_s
                  parsed_group_sort.each_with_index do |a, index|
                    puts a.to_s
                    parse_current = a.gsub("g", "").gsub("s", "").split(":")
                    puts parse_current
                    puts group.to_s
                    puts sort.to_s
                    #check depth against index, if matching we are at the level that needs incremented group
                    group << (depth == index + 1 ? parse_current[0].to_i + (n - 1) : parse_current[0].to_i)
                    #keep sort the same
                    sort << parse_current[1].to_i
                    puts group.to_s
                    puts sort.to_s
                  end

                  group_sort = ""

                  (1..(depth)).each_with_index do |n, index|
                    group_sort += (index == 0 ? "g" : "-g") + group[index].to_s.rjust(3, '0') + ":s" + sort[index].to_s.rjust(3, '0')
                  end

                  o.group_sort = group_sort

                  depth = 0
                  group = []
                  sort = []

                  if debug
                    puts sub_o.inspect
                    puts group_sort
                    puts o.inspect
                  end

                end
              end
            end
          end
        end

      end

      def apply_group_sort_debug(observation, code_level, form_container_type, form_container_label, form_container_nesting_level, remaining_children, last_child_id, group, sort)
        indentation = ""
        if code_level > 1
          (1..(code_level - 1)).each do |i|
            indentation += "      "
          end
        end
        puts indentation + ""
        puts indentation + ""
        puts indentation + ""
        puts indentation + ""
        puts indentation + ""
        puts indentation + "^^^^^^"
        puts indentation + "observation.entry: " + observation.entry.to_s
        puts indentation + "question.id: " + observation.question.id.to_s
        puts indentation + "question.sort_order: " + observation.question.sort_order.to_s
        puts indentation + "element_type: " + observation.question.answer_type.element_type.to_s
        puts indentation + "ancestry: " + observation.question.ancestry.to_s
        puts indentation + "last ancestor.id: " + observation.question.ancestry.to_s.split("/").last.to_s
        puts indentation + "......"
        puts indentation + "form_container_type: " + form_container_type.to_s
        puts indentation + "form_container_label: " + form_container_label.to_s
        puts indentation + "form_container_nesting_level: " + form_container_nesting_level.to_s
        puts indentation + "remaining_children: " + remaining_children.to_s
        puts indentation + "last_child_id: " + last_child_id.to_s
        puts indentation + "group: " + group.to_s
        puts indentation + "sort: " + sort.to_s
        puts indentation + "vvvvvv"
        puts indentation + ""
        puts indentation + ""
        puts indentation + ""
        puts indentation + ""
        puts indentation + ""
      end

  end
end
