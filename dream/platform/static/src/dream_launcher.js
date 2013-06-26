(function($, _) {
  "use strict";
  jsPlumb.bind("ready", function() {
    var dream_instance, available_people = {}, people_list,
        i, i_length, updateWorkerCount, json_plumb_configuration = {}, jio;
    jio = new jIO.newJio({type: "local", username: "dream", applicationname: "dream"});
    var window_id = 1;
    var element_id;
    var id_container = {}; // to allow generating next ids, like Machine_1, Machine_2, etc
    var property_container = {entity: {id: "entity", type:"string", _class: "Dream.Property"},
                              mean: {id: "mean", type: "string", _class: "Dream.Property"},
                              distributionType: {id: "distributionType", type: "string", _class: "Dream.Property"},
                              stdev: {id: "stdev", type: "string", _class: "Dream.Property"},
                              min: {id: "min", type: "string", _class: "Dream.Property"},
                              max: {id: "max", type: "string", _class: "Dream.Property"},
                              failureDistribution: {id: "failureDistribution", type: "string", _class: "Dream.Property"},
                              MTTF: {id: "MTTF", type: "string", _class: "Dream.Property"},
                              MTTR: {id: "MTTR", type: "string", _class: "Dream.Property"},
                              repairman: {id: "repairman", type: "string", _class: "Dream.Property"},
                              isDummy: {id: "isDummy", type: "string", _class: "Dream.Property"},
                              capacity: {id: "capacity", type: "string", _class: "Dream.Property"},
    };
    property_container["interarrivalTime"] =  {id:"interarrivalTime",
                                               property_list: [property_container["mean"], property_container["distributionType"]],
                                               _class: "Dream.PropertyList"};
    property_container["processingTime"] = {id:"processingTime",
                                            property_list: [property_container["mean"], property_container["distributionType"],
                                                            property_container["stdev"], property_container["min"],
                                                            property_container["max"],,
                                            ],
                                            _class: "Dream.PropertyList"};
    property_container["failures"] = {id:"failures",
                                      property_list: [property_container["failureDistribution"], property_container["MTTF"],
                                                      property_container["MTTR"], property_container["repairman"],
                                      ],
                                      _class: "Dream.PropertyList"};

    var configuration = {
      "Dream-Source": { anchor: {RightMiddle: {}},
                        property_list: [property_container["interarrivalTime"], property_container["entity"]],
      },
      "Dream-Machine": { anchor: {RightMiddle: {}, LeftMiddle: {}, TopCenter: {}, BottomCenter: {}},
                         property_list: [property_container["processingTime"], property_container["failures"]],
      },
      "Dream-Queue": { anchor: {RightMiddle: {}, LeftMiddle: {}},
                       property_list: [property_container["capacity"], property_container["isDummy"]],
      },
      "Dream-Exit": { anchor: {LeftMiddle: {}}},
      "Dream-Repairman": { anchor: {TopCenter: {}, BottomCenter: {}},
                           property_list: [property_container["capacity"]],
      },
    }
    dream_instance = DREAM.newDream(configuration)
    dream_instance.start();
    $( ".tool" ).draggable({ opacity: 0.7, helper: "clone",
                             stop: function(tool) {
                                     var box_top, box_left;
                                     box_top = tool.clientY;
                                     box_left = tool.clientX;
                                     id_container[tool.target.id] = (id_container[tool.target.id] || 0) + 1
                                     dream_instance.newElement({id : tool.target.id + "_" + id_container[tool.target.id],
                                                               coordinate: {y: box_top, x: box_left},
                                       class: tool.target.id,
                                     });
                                     window_id += 1;
                                  },
    });

    // Check if there is already data when we first load the page, if yes, then build graph from it
    jio.get({_id: "dream_demo"}, function(err, response) {
      console.log("jio get:", response);
      if (response !== undefined && response.data !== undefined) {
        // Add all elements
        _.each(response.data.element, function(value, key, list) {
          console.log("value", value);
          var element_id = value.id;
          var preference_data = response.data.preference[element_id] || {};
          _.each(_.pairs(preference_data), function(preference_value, preference_key, preference_list) {
            value[preference_value[0]] = preference_value[1];
          });
          console.log("going to add newElement", value);
          dream_instance.newElement(value);
        });
        // Now link elements between them and update id_container
        _.each(response.data.element, function(value, key, list) {
          var element_id = value.id, prefix, suffix, splitted_element_id,
              successor_list = value.successorList || [];
          splitted_element_id = element_id.split("_");
          prefix = splitted_element_id[0];
          suffix = splitted_element_id[1];
          console.log("suffix", suffix);
          id_container[prefix] = Math.max((id_container[prefix] || 0), parseInt(suffix, 10));
          console.log("id_container", id_container);
          if (successor_list.length > 0) {
            _.each(successor_list, function(successor_value, successor_key, list) {
              dream_instance.connect(value.id, successor_value);
            });
          }
        });
      }
      // once the data is read, we can subscribe to every changes
      $.subscribe("Dream.Gui.onDataChange", function(event, data) {
        console.log("onDataChange, data", data);
        $("#json_output")[0].value = JSON.stringify(data, undefined, " ");
        jio.put({_id: "dream_demo", data: data}, function(err, response) {
          console.log("jio put:", response);}
        );
      });
    });

  })

})(jQuery, _);
