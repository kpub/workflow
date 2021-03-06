/*jshint esversion: 6 */
document.onload = (function (d3, saveAs, Blob, vkbeautify) {
    "use strict";

    // define graphcreator object
    var GraphCreator = function (containerId, svg, nodes, edges, participants) {
        var thisGraph = this;
        thisGraph.nodes = nodes || [];
        thisGraph.edges = edges || [];
        thisGraph.participants = participants || [];
        thisGraph.containerId = containerId;

        thisGraph.state = {
            activeEdit: true,
            selectedNode: null,
            selectedEdge: null,
            mouseDownNode: null,
            mouseDownLink: null,
            justDragged: false,
            justScaleTransGraph: false,
            lastKeyDown: -1,
            shiftNodeDrag: false,
            selectedText: null,
            drawLine: '',
            type: ''
        };

        // define arrow markers for graph links
        var defs = svg.append('defs');
        defs.append('svg:marker')
            .attr('id', thisGraph.containerId + '-end-arrow')
            //定义箭头样式
            .attr('viewBox', '0 -5 10 10')
            //定义箭头位置
            .attr('refX', 10)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5');

        //define arrow markers for leading arrow
        defs.append('marker')
            .attr('id', thisGraph.containerId + '-mark-end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5');

        //定义选中样式的箭头
        defs.append('marker')
            .attr('id', thisGraph.containerId + '-selected-end-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 10)
            .attr('markerWidth', 5)
            .attr('markerHeight', 5)
            .attr('orient', 'auto')
            .append('svg:path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', 'rgb(229, 172, 247)');

        thisGraph.svg = svg;
        thisGraph.show_position = svg.append("text")
            .attr({
                'x': 1107,
                'y': 15,
                'fill': '#E1784B'
            });
        thisGraph.svgG = svg.append("g")
            .classed(thisGraph.consts.graphClass, true);
        var svgG = thisGraph.svgG;

        // displayed when dragging between nodes
        thisGraph.dragLine = svgG.append('path')
            .attr('class', 'link dragline hidden')
            .attr('d', 'M0,0L0,0')
            .style('marker-end', 'url(#' + thisGraph.containerId + '-mark-end-arrow)');

        // svg nodes and edges
        thisGraph.paths = svgG.append("g").selectAll("g");
        thisGraph.circles = svgG.append("g").selectAll("g");

        thisGraph.drag = d3.behavior.drag()
            .origin(function (d) {
                // d = selected circle. The drag origin is the origin of the circle
                return {
                    x: d.x,
                    y: d.y
                };
            })
            .on("dragstart", function () {
                d3.select(this).select("circle").attr("r", thisGraph.consts.nodeRadius + thisGraph.consts.nodeRadiusVary);
            })
            .on("drag", function (args) {
                thisGraph.state.justDragged = true;
                thisGraph.dragmove.call(thisGraph, args);
            })
            .on("dragend", function (args) {
                // args = circle that was dragged
                d3.select(this).select("circle").attr("r", thisGraph.consts.nodeRadius - thisGraph.consts.nodeRadiusVary);
            });

        // listen for key events
        d3.select(window).on("keydown", function () {
            thisGraph.svgKeyDown.call(thisGraph);
        })
            .on("keyup", function () {
                thisGraph.svgKeyUp.call(thisGraph);
            });
        svg.on("mousedown", function (d) {
            thisGraph.svgMouseDown.call(thisGraph, d);
        });
        svg.on("mouseup", function (d) {
            thisGraph.svgMouseUp.call(thisGraph, d);
        });
        svg.on("mousemove", function (d) {
            thisGraph.show_position.text('pos: ' + d3.mouse(svgG.node())[0].toFixed(0) + ', ' + d3.mouse(svgG.node())[1].toFixed(0));
        });

        // listen for dragging
        var dragSvg = d3.behavior.zoom()
            .scaleExtent([0.3, 2])
            .on("zoom", function () {
                if (d3.event.sourceEvent.shiftKey) {
                    // the internal d3 state is still changing
                    return false;
                } else {
                    thisGraph.zoomed.call(thisGraph);
                }
                return true;
            })
            .on("zoomstart", function () {
                var ael = d3.select("#" + thisGraph.consts.activeEditId).node();
                if (ael) {
                    ael.blur();
                }
                if (!d3.event.sourceEvent.shiftKey) d3.select('body').style("cursor", "move");
            })
            .on("zoomend", function () {
                d3.select('body').style("cursor", "auto");
            });
        thisGraph.dragSvg = dragSvg;
        svg.call(dragSvg).on("dblclick.zoom", null);

        // listen for resize
        window.onresize = function () {
            thisGraph.updateWindow(svg);
        };

        // handle uploaded data
        d3.select("#upload-input").on("click", function () {
            document.getElementById("hidden-file-upload").click();
        });
        d3.select("#hidden-file-upload").on("change", function () {
            if (window.File && window.FileReader && window.FileList && window.Blob) {
                var uploadFile = this.files[0];
                var filereader = new window.FileReader();
                filereader.onload = function () {
                    var txtRes = filereader.result;
                    // better error handling
                    try {
                        var jsonObj = JSON.parse(txtRes);
                        thisGraph.deleteGraph();
                        thisGraph.nodes = jsonObj.nodes;
                        var newEdges = jsonObj.edges;
                        newEdges.forEach(function (e, i) {
                            newEdges[i] = {
                                source: thisGraph.nodes.filter(function (n) {
                                    return n.id == e.source;
                                })[0],
                                target: thisGraph.nodes.filter(function (n) {
                                    return n.id == e.target;
                                })[0]
                            };
                        });
                        thisGraph.edges = newEdges;
                        thisGraph.updateGraph();
                    } catch (err) {
                        window.alert("Error parsing uploaded file\nerror message: " + err.message);
                        return;
                    }
                };
                filereader.readAsText(uploadFile);
            } else {
                alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
            }

        });

        $('#flowComponents .components-btn[type]').not('.noComponent').attr('draggable', 'true')
            .on('dragstart', function (ev) {
                // $('.full-left').css({cursor: 'no-drop'});
                $(this).siblings().removeClass('active').end().addClass('active');
                $('.full-right>.tab.active .full-right-top').addClass('activate');
                var json_obj = {
                    text: $(this).attr('data-show'),
                    component: $(this).attr('name'),
                    type: $(this).attr('type')
                };
                ev.originalEvent.dataTransfer.setData('tr_data', JSON.stringify(json_obj));
            })
            .on('dragend', function (ev) {
                $('.full-right>.tab.active .full-right-top').removeClass('activate');
            });
        $('.full-right .tab.active').on('drop', '.svg-container', function (ev) {
            ev.stopPropagation();
            ev.preventDefault();
            var position = {
                x: parseFloat(ev.originalEvent.offsetX),
                y: parseFloat(ev.originalEvent.offsetY)
            };
            position = thisGraph.parsePosition(this, position);
            var data = JSON.parse(ev.originalEvent.dataTransfer.getData('tr_data'));
            data = $.extend(data, position);
            thisGraph.state.type = data.type;
            var node = thisGraph.createNode(data);
            thisGraph.nodes.push(node);
            thisGraph.updateGraph();

        })
            .on('dragover', function (ev) {
                ev.preventDefault();
            });

        $('svg').on('click', function () {
            $('#rMenu').hide();
        });
        $('svg').on('contextmenu', function () {
            $('#flowComponents div[name=selectBtn]').trigger('click');
            return false;
        });

        //动态表单属性集-添加
        $('.extendAttr_add .green.button').on('click', function () {
            var id = $('.extendAttr_add.modal input[name="extendAttr_add_id"]').val();
            var name = $('.extendAttr_add.modal input[name="extendAttr_add_name"]').val();
            var variable = $('.extendAttr_add.modal input[name="extendAttr_add_variable"]').val();
            var type = $('.extendAttr_add.modal input[name="extendAttr_add_type"]').val();
            if (!id) {
                layer.msg('请输入ID！', {time: 2000, icon: 2});
                return false;
            }
            if (!name) {
                layer.msg('请输入name！', {time: 2000, icon: 2});
                return false;
            }
            if (!variable) {
                layer.msg('请输入variable！', {time: 2000, icon: 2});
                return false;
            }
            if (!type) {
                layer.msg('请输入type！', {time: 2000, icon: 2});
                return false;
            }
            var data = {id: id, name: name, variable: variable, type: type};
            data = {data: data, jsonstr: JSON.stringify(data)};
            var html = juicer($('#extended_attr_tpl').html(), data);
            var operate = $('.extendAttr_add.modal input[name="extendAttr_add_operate"]').val();
            if (operate) {
                var selectedTr = $('.extended_attr tbody tr.active');
                selectedTr.attr('jsonstr', data.jsonstr);
                selectedTr.find('td').eq(1).text(data.data.id);
                selectedTr.find('td').eq(2).text(data.data.name);
                selectedTr.find('td').eq(3).text(data.data.variable);
                selectedTr.find('td').eq(4).text(data.data.type);
            } else {
                $('.extended_attr:visible tbody').append(html).find('.ui.checkbox').checkbox();
            }
            $('.extendAttr_add.modal input').val("");
        });

        //动态表单设置-编辑
        $('.extended_attr .extendAttrEditBtn').on('click', function () {
            var selectedTr = $(this).parents('.grid').find('tbody tr.active');
            if (selectedTr.length < 1) {
                layer.msg('请选择一行!', {time: 2000, icon: 0});
                return false;
            }
            var jsonstr = $(this).parents('.grid').find('tbody tr.active').attr('jsonstr');
            var json = JSON.parse(jsonstr);
            $('.extendAttr_add.modal input[name="extendAttr_add_id"]').val(json.id);
            $('.extendAttr_add.modal input[name="extendAttr_add_name"]').val(json.name);
            $('.extendAttr_add.modal input[name="extendAttr_add_variable"]').val(json.variable);
            $('.extendAttr_add.modal input[name="extendAttr_add_type"]').val(json.type);
            $('.extendAttr_add.modal input[name="extendAttr_add_operate"]').val("1");
            $('.extended_attr .extendAttrAddBtn').trigger('click');
            // $('.extendAttr_add.modal').modal('show'); //会关闭一级弹窗
        });

        //动态表单属性集-删除
        $('.extended_attr .extendAttrDelBtn').on('click', function () {
            var tr = $(this).parents('.grid').find('tbody tr.active');
            if (tr.length > 0) {
                tr.remove();
            } else {
                layer.msg('请选择一行!', {time: 2000, icon: 0});
            }
        });

        //常规-定义
        $('.conventional').on('click', '.definitionBtn', function (event) {
            var selectedNode = thisGraph.state.selectedNode;
            var rol_id = $('.conventional select[name="definition_role"]').siblings('.text').attr('definition_id');
            $('.conventional_definition').find('.menu .item[data-tab="definition_2/processer"]').hide();
            $('.conventional_definition').find('.menu .item[data-tab="definition_2/historyactselect"]').hide();
            var hasLinked = thisGraph.hasLinked(selectedNode, true, -1);
            if (hasLinked) {
                var select = {
                    selectId: 'definition_name',
                    options: [{
                        value: selectedNode.id + '|' + selectedNode.title,
                        show: selectedNode.title
                    }]
                };
                var edges = thisGraph.getLinkedEdges(selectedNode, -1);
                var options = edges.filter(function (edge) {
                    return edge.source.type == 'activity';
                }).map(function (edge) {
                    return {
                        value: edge.source.id + '|' + edge.source.title,
                        show: edge.source.title
                    };
                });
                select.options = select.options.concat(options);
                $('.conventional_definition div.definition_name label').siblings().remove();
                $('.conventional_definition div.definition_name').append(juicer($('#select_tpl').html(), select))
                    .find('.ui.dropdown').dropdown();
                $('.conventional_definition').find('.menu .item[data-tab="definition_2/historyactselect"]').show();// 其它activity指向本，显示
            }
            if (rol_id) {// 编辑
                $('.conventional_definition input[name="conventional_def_operate"]').val(1);// 页面标记 1：代表编辑
                var participants = thisGraph.participants;
                thisGraph.participants.forEach(function (participant) {
                    if (participant.conventional_definition_id == rol_id) {
                        $('.conventional_definition div[data-tab="definition_1"]').find('input[name]:not(".hidden"), textarea').each(function () {
                            $(this).val(participant[$(this).attr('name')]);
                        });
                        if (participant.typeName) {
                            participant.typeName.forEach(function (item, i) {
                                var itemValue_show = participant.itemValue[i].split('|')[1] ? participant.itemValue[i].split('|')[1] : '',
                                    itemValue = participant.itemValue[i] ? participant.itemValue[i] : '',
                                    itemName = participant.itemName[i].split('|')[1];
                                $('.conventional_definition .definition_condition tbody').append(
                                    '<tr>' +
                                    '  <td name="typeName" value="' + item + '">' + item.split('|')[1] + '</td>' +
                                    '  <td name="itemName" value="' + participant.itemName[i] + '">' + itemName + '</td>' +
                                    '  <td name="itemValue" value="' + itemValue + '">' + itemValue_show + '</td>' +
                                    '  <td name="secLevelS" value="' + participant.secLevelS[i] + '">' + participant.secLevelS[i] + '</td>' +
                                    '  <td name="secLevelE" value="' + participant.secLevelE[i] + '">' + participant.secLevelE[i] + '</td>' +
                                    '  <td name="roleName" value="' + participant.roleName[i] + '">' + participant.roleName[i] + '</td>' +
                                    '</tr>');
                            });
                        }
                    }
                });
            } else { //增加
                $('.conventional_definition input[name="conventional_definition_id"]').val(seqer_participantID.gensym());
            }
        });
    };

    /**
     * 根据缩放比例和偏移量转换坐标
     * @param  {DOM}    svgContainer .svgContainer元素
     * @param  {Object} position     位置坐标
     * @return {Object} position     转换后的坐标
     */
    GraphCreator.prototype.parsePosition = function (svgContainer, position) {
        var transform = $(svgContainer).find('.graph').attr('transform'); // transform="translate(20,11) scale(1)"
        if (transform) {
            var result = []; // ['20,11', '1']
            var regExp_ = /\(([^)]*)\)/g;
            var ele;
            while ((ele = regExp_.exec(transform)) != null) {
                result.push(ele[1]);
            }
            var translate = result[0] && result[0].split(/,|\s/) || [0, 0]; // IE11 result[0] 为 '23.45 22.87'
            var scale = result[1] && result[1].split(',')[0] || 1;
            if (translate.length == 1 && translate[0] == 0) { // 兼容IE11
                translate.push(0);
            }
            position.x = (position.x - translate[0]) / scale;
            position.y = (position.y - translate[1]) / scale;
        }
        return position;
    };

    // 展示-后置条件或转移属性
    GraphCreator.prototype.showTransition = function (selector, transition) {
        var thisGraph = this;
        var postCond = transition.postCondition;
        //清空 转移信息/条件设置/事件
        //转移信息
        $(selector).find('input[name=edgeId]').val(transition.edgeId);
        $(selector).find('input[name=edgeName]').val(postCond && postCond.edgeName || '');
        $(selector).find('input[name=sourceTitle]').val(transition.source.title);
        $(selector).find('input[name=targetTitle]').val(transition.target.title);
        $(selector).find('input[name=conditionData]').val(postCond && postCond.conditionData || '');
        $(selector).find('textarea[name=description]').val(postCond && postCond.description || '');
        //遍历扩展属性
        if (postCond.extendedAttrs) {
            postCond.extendedAttrs.forEach(function (item) {
                var extendedAttr = JSON.parse(item);
                var data = {name: extendedAttr.name, value: extendedAttr.value};
                data = {data: data, jsonstr: JSON.stringify(data)};
                var html = juicer($('#extended_attr_tpl').html(), data);
                $('.transferInf_extended_attr tbody').append(html).find('.ui.checkbox').checkbox();
                $(".transferInf_extended_attr .postCondi_extendedAttr").mCustomScrollbar("update");
            });
        }
        //遍历条件设置-类型（条件）下列表
        if (postCond && postCond.conditype == 'CONDITION') {
            if (postCond.condixml) {//condixml base64
                var fieldConditions_obj = {fieldCondition: []};
                var fieldConditions_str = Base64.decode(postCond.condixml);
                fieldConditions_obj.fieldConditions_type = $(fieldConditions_str).attr('type');
                $(fieldConditions_str).find('fieldCondition').each(function (fc) {
                    var fieldCondition = {};
                    fieldCondition.fieldCondition_type = $(this).attr('type');
                    fieldCondition.key = $(this).find('expression').eq(0).attr('key');
                    fieldCondition.sign_one = $(this).find('expression').eq(0).attr('sign');
                    fieldCondition.type = $(this).find('expression').eq(0).attr('type');
                    fieldCondition.displayValue_one = $(this).find('expression').eq(0).attr('displayValue');
                    fieldCondition.sign_two = $(this).find('expression').eq(1).attr('sign');
                    fieldCondition.displayValue_two = $(this).find('expression').eq(1).attr('displayValue');
                    var tr = thisGraph.getConditionList(fieldCondition);
                    $(selector).find('.conditionDiv tbody').append(tr);
                });
                $(selector).find('.conditionDiv tbody').data('fieldConditions_type', fieldConditions_obj.fieldConditions_type);
            }
        } else {
            $(selector).find('.conditionDiv tbody').removeData('fieldConditions_type');
        }
        //遍历条件设置-类型（按业务对象转移）下列表
        if (postCond && postCond.conditype == 'WORKFLOWBEAN') {
            if (postCond.condixml) {
                var beanConditions_obj = {beanCondition: []};
                var beanConditions_str = Base64.decode(postCond.condixml);
                beanConditions_obj.fieldConditions_type = $(beanConditions_str).attr('type');
                $(beanConditions_str).find('beanCondition').each(function (fc) {
                    var beanCondition = {};
                    beanCondition.fieldCondition_type = $(this).attr('type');
                    beanCondition.key = $(this).find('expression').eq(0).attr('key').split('.get')[1].replace('()', '');
                    beanCondition.sign_one = $(this).find('expression').eq(0).attr('sign');
                    beanCondition.type = $(this).find('expression').eq(0).attr('type');
                    beanCondition.displayValue_one = $(this).find('expression').eq(0).attr('displayValue');
                    beanCondition.sign_two = $(this).find('expression').eq(1).attr('sign');
                    beanCondition.displayValue_two = $(this).find('expression').eq(1).attr('displayValue');
                    beanCondition.bean = $(this).attr('bean').split(',')[0];
                    beanCondition.paramField = $(this).attr('paramField');
                    var num = $(this).attr('code');
                    var tr = thisGraph.getConditionList(beanCondition, num);
                    $(selector).find('.workflowbeanDiv tbody').append(tr);
                });
                $(selector).find('.workflowbeanDiv tbody').data('fieldConditions_type', beanConditions_obj.fieldConditions_type);
            }
        } else {
            $(selector).find('.workflowbeanDiv tbody').removeData('fieldConditions_type');
        }
        //条件设置 事件（标签）
        if (postCond) {
            $(selector).find('select[name=conditype]').parent().dropdown('set selected', postCond.conditype || '');

            $(selector).find('select[name=transitionEventType]').parent().dropdown('set selected', postCond.transitionEventType || '');
            $(selector).find('input[name=transitionEvent]').val(postCond.transitionEvent);
        }
    };

    // 更新-后置条件或转移属性
    GraphCreator.prototype.updatePostCondi = function (selector) {
        var thisGraph = this;
        var item_act = $(selector).find('.list .item.active');
        if (item_act.length || selector == '.prop_edge') {
            var edge;
            if (item_act.length) {
                var jsonObj = JSON.parse(item_act.attr('jsonStr'));
                thisGraph.edges.forEach(function (item, i) {
                    if (item.edgeId == jsonObj.edgeId) {
                        edge = item;
                    }
                });
            } else {
                edge = thisGraph.state.selectedEdge;
            }
            var postCondition = {transitionRuleType: 'Script_Rule'};
            var $transferInf = $(selector).find('div[data-tab="four/a"]'); // 转移信息
            $transferInf.find("input:not(.hidden), select, textarea").each(function () {
                postCondition[$(this).attr('name')] = $(this).val();
            });
            postCondition.extendedAttrs = [];
            $transferInf.find('tbody tr').each(function () {
                var jsonstr = $(this).attr('jsonstr');
                postCondition.extendedAttrs.push(jsonstr);
            });
            var $conditionSet = $(selector).find('div[data-tab="four/b"]');//条件设置
            var conditype = $conditionSet.find('select[name=conditype]').val();
            postCondition.conditype = conditype;
            if (conditype == 'CONDITION') {//类型选择条件
                var tr = $(selector).find('.conditionDiv tbody').find('tr');
                var fieldCondition = '',
                    condixml = '',
                    fieldConditions_type = '';
                if (tr.length) {
                    tr.each(function () {
                        var json_obj = JSON.parse($(this).attr('jsonstr'));
                        fieldCondition +=
                            ' <fieldCondition type="' + json_obj.fieldCondition_type + '">' +
                            '   <expression key="' + json_obj.key + '" sign="' + json_obj.sign_one + '" type="' + json_obj.type + '" displayValue="' + json_obj.displayValue_one + '"><![CDATA[' + json_obj.displayValue_two + ']]></expression>' +
                            '   <expression key="' + json_obj.key + '" sign="' + json_obj.sign_two + '" type="' + json_obj.type + '" displayValue="' + json_obj.displayValue_two + '"><![CDATA[' + json_obj.displayValue_two + ']]></expression>' +
                            ' </fieldCondition>';
                    });
                    fieldConditions_type = $(selector).find('.conditionDiv select[name=fieldConditions_type]').parent().dropdown('get value');
                }
                condixml = '<FieldConditions type="' + fieldConditions_type + '">' + fieldCondition + '</FieldConditions>';
                condixml = Base64.encode(condixml);
                postCondition.condixml = condixml;
            }
            if (conditype == 'EXCEPTION') {//类型选择异常
                postCondition.condiException = $(selector).find('.exceptionDiv select[name=condiException]').parent().dropdown('get value');
            }
            if (conditype == 'WORKFLOWBEAN') { //类型选择业务对象转移
                var w_tr = $(selector).find('.workflowbeanDiv tbody').find('tr');
                var beanCondition = '',
                    w_condixml = '',
                    beanConditions_type = '';
                if (w_tr.length) {
                    w_tr.each(function () {
                        var json_obj = JSON.parse($(this).attr('jsonstr'));
                        beanCondition +=
                            '<beanCondition code="' + json_obj.code + '" type="' + json_obj.beanConditions_type + '" bean="' + json_obj.bean + '" paramField="' + json_obj.paramField + '">' +
                            '  <expression key="' + json_obj.key + '" sign="' + json_obj.sign_one + '" type="' + json_obj.type + '" displayValue="' + json_obj.displayValue_one + '"><![CDATA[' + json_obj.displayValue_one + ']]></expression>' +
                            '  <expression key="' + json_obj.key + '" sign="' + json_obj.sign_two + '" type="' + json_obj.type + '" displayValue="' + json_obj.displayValue_two + '"><![CDATA[' + json_obj.displayValue_two + ']]></expression>' +
                            '</beanCondition>';
                    });
                    beanConditions_type = $(selector).find('.workflowbeanDiv input[name=beanConditions_type]').val();
                }
                w_condixml = '<beanConditions type="' + beanConditions_type + '">' + beanCondition + '</beanConditions>';
                w_condixml = Base64.encode(w_condixml);
                postCondition.condixml = w_condixml;
            }
            if (conditype == 'USERDEFINE') {//类型选择用户自定义
                postCondition.condition_data = $(selector).find('.userdefineDiv input').val();
            }
            if (conditype == 'CUSTOM') {//类型选择自定义转移
                postCondition.condition_data = $(selector).find('.customDiv textarea').val();
            }
            var $event = $(selector).find('div[data-tab="four/c"]'); //事件（标签）
            $event.find("input[name], select").each(function () {
                postCondition[$(this).attr('name')] = $(this).val();
            });
            postCondition.condition = $('.segment input[name="definition_condition"]').val();
            edge.edgeId = postCondition.edgeId;
            edge.postCondition = postCondition;
            edge.sFlowListener = $(".five.wide.field").find("select[name=sFlowListener] option:selected").val();//获取连线监听器
            if (selector == '.post_condition') {
                var splitType = $(selector).find('select[name=splitType]').val();
                thisGraph.state.selectedNode.postCondition = {splitType: splitType};
            }
        }
    };

    // 获取activity的ExtendedAttributes
    GraphCreator.prototype.getExtendedAttributes = function (node, deadlineXpdl, conventionalXpdl) {
        var thisGraph = this;
        var extendAttr = node.extendAttr;
        var highLevel = node.highLevel;
        var highLevelXpdl, isCreateNew, syncType, responsible;
        if (highLevel) {
            highLevelXpdl += highLevel.activityEndEvent ? '<ExtendedAttribute Name="ActivityEndEvent" Value="' + highLevel.activityEndEvent + '"/>' : '';
            highLevelXpdl += highLevel.activityCreateEvent ? '<ExtendedAttribute Name="ActivityCreateEvent" Value="' + highLevel.activityCreateEvent + '"/>' : '';
            highLevelXpdl += highLevel.finishRule ? '<ExtendedAttribute Name="FinishRule" Value="' + highLevel.finishRule + '"/>' : '<ExtendedAttribute Name="FinishRule"/>';
        } else {
            highLevelXpdl = '<ExtendedAttribute Name="deadline" />';
        }
        isCreateNew = node.frontCondition.isCreateNew ? '<ExtendedAttribute Name="isCreateNew" Value="' + node.frontCondition.isCreateNew + '"/>' : '';
        syncType = node.frontCondition.syncType != "" && node.frontCondition.voteText ? '<ExtendedAttribute Name="syncType" Value="' + node.frontCondition.syncType + '|' + node.frontCondition.voteText + '"/>' : '';
        responsible = node.monitorinf.responsible ? '<ExtendedAttribute Name="responsible" Value="' +
            node.monitorinf.responsible.join(',') + '"/>' : '<ExtendedAttribute Name="responsible"/>';
        var startAndEndXpdl = '';
        if (node.component == 'blockActivity' && node.activitySet.graphCreator) {
            var sub_graph = node.activitySet.graphCreator;
            var startAndEnd = thisGraph.filterStartAndEnd.call(sub_graph);
            startAndEnd.forEach(function (node) {
                switch (node.type) {
                    case 'start':
                        var outEdge = thisGraph.getLinkedEdges.call(sub_graph, node, 1);
                        if (outEdge.length) {
                            startAndEndXpdl += '<ExtendedAttribute Name="StartOfBlock" Value="none;' + outEdge[0].target.id + ';' + node.x + ';' + node.y + ';' + outEdge[0].drawLine + '"/>';
                        }
                        break;
                    case 'end':
                        var inToEdge = thisGraph.getLinkedEdges.call(sub_graph, node, -1);
                        if (inToEdge.length) {
                            startAndEndXpdl += '<ExtendedAttribute Name="EndOfBlock" Value="none;' + inToEdge[0].source.id + ';' + node.x + ';' + node.y + ';' + inToEdge[0].drawLine + '"/>';
                        }
                        break;
                }
            });
        }

        var ExtendedAttributes =
            '<ExtendedAttributes>' +
            startAndEndXpdl +
            conventionalXpdl.isMulInstance +
            '   <ExtendedAttribute Name="isResponsibleTem" Value="' + node.monitorinf.isResponsibleTem + '"/>' +
            responsible +
            syncType +
            conventionalXpdl.MustActivity +
            isCreateNew +
            conventionalXpdl.taskAssignMode +
            conventionalXpdl.assignmentsOrder +
            conventionalXpdl.completeAllAssignments +
            conventionalXpdl.autoAcceptAllAssignments +
            conventionalXpdl.isResponsible +
            deadlineXpdl.deadline +
            highLevelXpdl +
            '   <ExtendedAttribute Name="warnTimeiFrequency"/>' +
            deadlineXpdl.warnTime +
            deadlineXpdl.warnAgentClassName +
            deadlineXpdl.limitAgentClassName +
            conventionalXpdl.participantID +
            '   <ExtendedAttribute Name="XOffset" Value="' + node.x + '"/>' +
            '   <ExtendedAttribute Name="YOffset" Value="' + node.y + '"/>';
        if (extendAttr) {
            extendAttr.forEach(function (ext) {
                ExtendedAttributes +=
                    '   <ExtendedAttribute Name="' + JSON.parse(ext).name + '" Value="' + JSON.parse(ext).value + '"/>';
            });
        }
        ExtendedAttributes +=
            '</ExtendedAttributes>';
        return ExtendedAttributes;
    };

    //获取activity进出线的数量
    GraphCreator.prototype.activityInOutNum = function (node) {
        var thisGraph = this;
        var numIn = 0,
            numOut = 0,
            transitionRefs = '',
            activity_inOut = {};

        thisGraph.edges.forEach(function (edge) {
            var source = edge.source.component;
            var target = edge.target.component;
            if (source != "startComponent" && target != "endComponent") {
                if (edge.source == node) {
                    numOut++;
                    transitionRefs += '<TransitionRef Id="' + edge.edgeId + '"/>';
                } else if (edge.target == node) {
                    numIn++;
                }
            }
        });
        activity_inOut.numIn = numIn;
        activity_inOut.numOut = numOut;
        activity_inOut.transitionRefs = transitionRefs;
        return activity_inOut;
    };

    //生成所有activity xml添加至xmlContainer
    GraphCreator.prototype.emergeAllXmlContent = function () {
        var thisGraph = this;
        var curText = vkbeautify.xml(this.bpmnStr);
        return curText;
    }

    GraphCreator.prototype.startAndEndOfWorkflow = function () {
        var thisGraph = this;
        var edges = thisGraph.edges;
        var nodes_start = '',
            nodes_end = '';
        thisGraph.nodes.forEach(function (node) {
            switch (node.type) {
                case 'start':
                    edges.forEach(function (edge) {
                        if (edge.source == node) {
                            nodes_start += '<ExtendedAttribute Name="StartOfWorkflow" Value="none;' + edge.target.id + ';' + node.x + ';' + node.y + ';' + edge.drawLine + '"/>';
                        }
                    });
                    break;
                case 'end':
                    edges.forEach(function (edge) {
                        if (edge.target == node) {
                            nodes_end += '<ExtendedAttribute Name="EndOfWorkflow" Value="none;' + edge.source.id + ';' + node.x + ';' + node.y + ';' + edge.drawLine + '"/>';
                        }
                    });
                    break;
            }
        });
        return {
            start: nodes_start,
            end: nodes_end
        };

    };

    //生成所有activity xml添加至xpdlContainer
    GraphCreator.prototype.emergeAllxpdlContent = function () {
        var thisGraph = this;
        var blockActivities = thisGraph.filterBlockActivities();
        var activitySets = '';
        if (blockActivities.length) {
            blockActivities.forEach(function (blockActivity) {
                var activitySetId = blockActivity.activitySet.activitySetId;
                var graph = blockActivity.activitySet.graphCreator;
                if (graph) {
                    activitySets += graph.emergeActivitySet(activitySetId);
                } else {
                    activitySets += '<ActivitySet Id="' + activitySetId + '"></ActivitySet>';
                }

            });
            activitySets = '<ActivitySets>' + activitySets + '</ActivitySets>';
        }

        var xpdl = '<WorkflowProcesses>' +
            '   <WorkflowProcess AccessLevel="PUBLIC" Id="' + workflow_id + '" Name="' + workflow_name + '">' +
            '       <ProcessHeader DurationUnit="D">' +
            '           <Created>' + create_time + '</Created>' +
            '           <Priority/>' +
            '       </ProcessHeader>' +
            '       <RedefinableHeader PublicationStatus="UNDER_TEST">' +
            '           <Author>管理员</Author>' +
            '           <Version>1.0</Version>' +
            '       </RedefinableHeader>' +
            thisGraph.getParticipants() +
            '       <Applications>' +
            '           <Application Id="workflow_DefaultToolAgent" Name="执行其他的toolagent">' +
            '               <Description>执行其他的toolagent</Description>' +
            '               <FormalParameters>' +
            '                   <FormalParameter Id="ToolAgentClass" Index="0" Mode="IN">' +
            '                       <DataType>' +
            '                           <ExternalReference location="java.lang.String"/>' +
            '                       </DataType>' +
            '                       <Description>其他组件名称</Description>' +
            '                   </FormalParameter>' +
            '               </FormalParameters>' +
            '               <ExtendedAttributes>' +
            '                   <ExtendedAttribute Name="ToolAgentClassName" Value="workflow.DefaultToolAgent"/>' +
            '                   <ExtendedAttribute Name="ToolAgentClass"/>' +
            '               </ExtendedAttributes>' +
            '           </Application>' +
            '           <Application Id="workflow_sendMailToolAgent" Name="发送邮件">' +
            '               <Description>发送电子邮件</Description>' +
            '               <FormalParameters>' +
            '                   <FormalParameter Id="body" Index="body" Mode="IN">' +
            '                       <DataType>' +
            '                           <BasicType Type="STRING"/>' +
            '                       </DataType>' +
            '                       <Description>邮件正文</Description>' +
            '                   </FormalParameter>' +
            '                   <FormalParameter Id="subject" Index="subject" Mode="IN">' +
            '                       <DataType>' +
            '                           <BasicType Type="STRING"/>' +
            '                       </DataType>' +
            '                       <Description>邮件标题</Description>' +
            '                   </FormalParameter>' +
            '                   <FormalParameter Id="to" Index="to" Mode="IN">' +
            '                       <DataType>' +
            '                           <BasicType Type="STRING"/>' +
            '                       </DataType>' +
            '                       <Description>邮件地址,多个使用 , 分割</Description>' +
            '                   </FormalParameter>' +
            '               </FormalParameters>' +
            '               <ExtendedAttributes>' +
            '                   <ExtendedAttribute Name="ToolAgentClassName" Value="workflow.sendMailToolAgent"/>' +
            '               </ExtendedAttributes>' +
            '           </Application>' +
            '           <Application Id="workflow_dbToolAgent" Name="修改数据">' +
            '               <Description>修改数据库数据</Description>' +
            '               <FormalParameters>' +
            '                   <FormalParameter Id="tableName" Index="0" Mode="IN">' +
            '                       <DataType>' +
            '                           <ExternalReference location="java.lang.String"/>' +
            '                       </DataType>' +
            '                       <Description>数据表名称</Description>' +
            '                   </FormalParameter>' +
            '                   <FormalParameter Id="dbdata" Index="1" Mode="IN">' +
            '                       <DataType>' +
            '                           <ExternalReference location="java.lang.Object"/>' +
            '                       </DataType>' +
            '                       <Description>需要操作的数据可以是一个String,pojo或者Map</Description>' +
            '                   </FormalParameter>' +
            '                   <FormalParameter Id="DbActionType" Index="2" Mode="IN">' +
            '                       <DataType>' +
            '                           <BasicType Type="INTEGER"/>' +
            '                       </DataType>' +
            '                       <Description>对数据库的操作类型，取值：1 增加 2 修改 3 删除</Description>' +
            '                   </FormalParameter>' +
            '                   <FormalParameter Id="Condition" Index="3" Mode="IN">' +
            '                       <DataType>' +
            '                           <ExternalReference location="java.lang.Object"/>' +
            '                       </DataType>' +
            '                       <Description>数据操作条件，可以为pojo或者Map,为数据的操作条件</Description>' +
            '                   </FormalParameter>' +
            '               </FormalParameters>' +
            '               <ExtendedAttributes>' +
            '                   <ExtendedAttribute Name="ToolAgentClassName" Value="workflow.dbToolAgent"/>' +
            '                   <ExtendedAttribute Name="DataTableName"/>' +
            '               </ExtendedAttributes>' +
            '           </Application>' +
            '           <Application Id="workflow_fetchDataAgent" Name="获取数据">' +
            '               <Description>获取数据库数据</Description>' +
            '               <FormalParameters>' +
            '                   <FormalParameter Id="Condition" Index="1" Mode="IN">' +
            '                       <DataType>' +
            '                           <ExternalReference location="java.lang.Object"/>' +
            '                       </DataType>' +
            '                       <Description>数据操作条件，可以为pojo或者Map,为数据的操作条件</Description>' +
            '                   </FormalParameter>' +
            '               </FormalParameters>' +
            '               <ExtendedAttributes>' +
            '                   <ExtendedAttribute Name="ToolAgentClassName" Value="workflow.fetchDataAgent"/>' +
            '                   <ExtendedAttribute Name="DataTableName"/>' +
            '               </ExtendedAttributes>' +
            '           </Application>' +
            '       </Applications>';

        xpdl += activitySets +
            thisGraph.emergeActivities() +
            thisGraph.emergeTransitions() +
            '       <ExtendedAttributes>' +
            '           <ExtendedAttribute Name="IsMain" Value="true"/>' +
            '           <ExtendedAttribute Name="warnTimeiFrequency"/>' +
            '           <ExtendedAttribute Name="warnTime"/>' +
            '           <ExtendedAttribute Name="warnAgentClassName"/>' +
            '           <ExtendedAttribute Name="LimitAgentClassName"/>' +
            '           <ExtendedAttribute Name="initFormPlugin" Value="wfd_self.xml"/>' +
            '           <ExtendedAttribute Name="initReserve"/>' +
            '           <ExtendedAttribute Name="initType" Value="money"/>' +
            '           <ExtendedAttribute Name="initAuthor" Value="管理员"/>' +
            thisGraph.startAndEndOfWorkflow().start +
            thisGraph.startAndEndOfWorkflow().end +
            '       </ExtendedAttributes>' +
            '   </WorkflowProcess>' +
            '</WorkflowProcesses>';
        return vkbeautify.xml(xpdl);
    };

    GraphCreator.prototype.findActByActSetId = function (activitysetid) {
        var thisGraph = this;
        var blockActivity = thisGraph.nodes.find(function (node) {
            return node.component == 'blockActivity' && node.activitySet.activitySetId == activitysetid;
        });
        return blockActivity;
    };

    GraphCreator.prototype.filterActivities = function () {
        var thisGraph = this;
        var activities = thisGraph.nodes.filter(function (node) {
            return node.type == 'activity';
        });
        return activities;
    };

    GraphCreator.prototype.filterStartAndEnd = function () {
        var thisGraph = this;
        var activities = thisGraph.nodes.filter(function (node) {
            return node.type == 'start' || node.type == 'end';
        });
        return activities;
    };

    GraphCreator.prototype.edgesLinkAcivity = function () {
        var thisGraph = this;
        var edges_act = thisGraph.edges.filter(function (edge) {
            return (edge.source.type != 'start' && edge.target.type != 'end');
        });
        return edges_act;
    };

    GraphCreator.prototype.consts = {
        selectedClass: "selected",
        connectClass: "connect-node",
        circleGClass: "conceptG",
        graphClass: "graph",
        activeEditId: "active-editing",
        BACKSPACE_KEY: 8,
        DELETE_KEY: 46,
        ENTER_KEY: 13,
        nodeRadius: 34,
        nodeRadiusVary: 1
    };

    /**
     * 获取link样式 [添加线样式 start:连线起点 des:连线终点]
     * 如果 |dif.x| > |dif.y| 左右连线，反之，上下连线
     * 如果 dif.x > 0 && dif.y < 0 第四象限
     * 如果 dif.x > 0 && dif.y > 0 第一象限
     * 如果 dif.x < 0 && dif.y > 0 第二象限
     * 如果 dif.x < 0 && dif.y < 0 第三象限
     */
    GraphCreator.prototype.getLink_d_1 = function (start, des) {
        var d = start;
        var mid_x = (d.x + des.x) / 2,
            mid_y = (d.y + des.y) / 2;
        var dif_x = des.x - d.x,
            dif_y = des.y - d.y;
        var link;
        if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
            if (dif_x > 0 && dif_y > 0) { //第一象限（200,200-300,300） 200,200->200,295->205,300->300,300
                // <path d="M 100,100 L 100,145 M 100,145 A 5,5,0,0,0 105,150 M 105,150 L 195,150 M 195,150 A 5,5,0,0,1 200,155 M 200,155 L 200,200" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y - 5) + 'M' + d.x + ',' + (des.y - 5) + 'A 5,5,0,0,0 ' + (d.x + 5) + ',' + des.y +
                    'M' + (d.x + 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y > 0) { //第二象限（200,200-100,300）
                // <path d="M 200,200 L 200,245 M 200,245 A 5,5,0,0,1 195,250 M 195,250 L 105,250 M 105,250 A 5,5,0,0,0 100,255 M 100,255 L 100,300" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y - 5) + 'M' + d.x + ',' + (des.y - 5) + 'A 5,5,0,0,1 ' + (d.x - 5) + ',' + des.y +
                    'M' + (d.x - 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y < 0) { //第三象限（200,200-100,100）
                // <path d="M 200,200 L 200,155 M 200,155 A 5,5,0,0,0 195,150 M 195,150 L 105,150 M 105,150 A 5,5,0,0,1 100,145 M 100,145 L 100,100" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y + 5) + 'M' + d.x + ',' + (des.y + 5) + 'A 5,5,0,0,0 ' + (d.x - 5) + ',' + des.y +
                    'M' + (d.x - 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y < 0) { //第四象限（200,200-300,100）
                // <path d="M 200,200 L 200,155 M 200,155 A 5,5,0,0,1 205,150 M 205,150 L 295,150 M 295,150 A 5,5,0,0,0 300,145 M 300,145 L 300,100" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y + 5) + 'M' + d.x + ',' + (des.y + 5) + 'A 5,5,0,0,1 ' + (d.x + 5) + ',' + des.y +
                    'M' + (d.x + 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
        } else { // 上下连线
            if (dif_x > 0 && dif_y > 0) { //第一象限（200,200-300,300） 200,200->295,200->300,205->300,300
                // <path d="M 200,200 L 295,200 M 295,200 A 5,5,0,0,1 300,205 M 300,205 L 300,300 M 250,295 A 5,5,0,0,0 255,300 M 255,300 L 300,300" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x - 5) + ',' + d.y + 'M' + (des.x - 5) + ',' + d.y + 'A 5,5,0,0,1 ' + des.x + ',' + (d.y + 5) +
                    'M' + des.x + ',' + (d.y + 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y > 0) { //第二象限（200,200-100,300）
                // <path d="M 200,200 L 155,200 M 155,200 A 5,5,0,0,0 150,205 M 150,205 L 150,295 M 150,295 A 5,5,0,0,1 145,300 M 145,300 L 100,300" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x + 5) + ',' + d.y + 'M' + (des.x + 5) + ',' + d.y + 'A 5,5,0,0,0 ' + des.x + ',' + (d.y + 5) +
                    'M' + des.x + ',' + (d.y + 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y < 0) { //第三象限（200,200-100,100）
                // <path d="M 200,200 L 155,200 M 155,200 A 5,5,0,0,1 150,195 M 150,195 L 150,105 M 150,105 A 5,5,0,0,0 145,100 M 145,100 L 100,100" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x + 5) + ',' + d.y + 'M' + (des.x + 5) + ',' + d.y + 'A 5,5,0,0,1 ' + des.x + ',' + (d.y - 5) +
                    'M' + des.x + ',' + (d.y - 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y < 0) { //第四象限（200,200-300,100）
                // <path d="M 200,200 L 245,200 M 245,200 A 5,5,0,0,0 250,195 M 250,195 L 250,105 M 250,105 A 5,5,0,0,1 255,100 M 255,100 L 300,100" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x - 5) + ',' + d.y + 'M' + (des.x - 5) + ',' + d.y + 'A 5,5,0,0,0 ' + des.x + ',' + (d.y - 5) +
                    'M' + des.x + ',' + (d.y - 5) + 'L' + des.x + ',' + des.y;
            }
        }
        return link;
    };

    /**
     * 获取link样式 [添加线样式 start:连线起点 des:连线终点]
     * 如果 |dif.x| > |dif.y| 左右连线，反之，上下连线
     * 如果 dif.x > 0 && dif.y < 0 第四象限
     * 如果 dif.x > 0 && dif.y > 0 第一象限
     * 如果 dif.x < 0 && dif.y > 0 第二象限
     * 如果 dif.x < 0 && dif.y < 0 第三象限
     */
    GraphCreator.prototype.getLink_d_2 = function (start, des) {
        var d = start;
        var mid_x = (d.x + des.x) / 2,
            mid_y = (d.y + des.y) / 2;
        var dif_x = des.x - d.x,
            dif_y = des.y - d.y;
        var link;
        if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
            if (dif_x > 0 && dif_y > 0) { //第一象限（200,200-300,300） 200,200->295,200->300,205->300,300
                // <path d="M 200,200 L 295,200 M 295,200 A 5,5,0,0,1 300,205 M 300,205 L 300,300 M 250,295 A 5,5,0,0,0 255,300 M 255,300 L 300,300" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x - 5) + ',' + d.y + 'M' + (des.x - 5) + ',' + d.y + 'A 5,5,0,0,1 ' + des.x + ',' + (d.y + 5) +
                    'M' + des.x + ',' + (d.y + 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y > 0) { //第二象限（200,200-100,300）
                // <path d="M 200,200 L 155,200 M 155,200 A 5,5,0,0,0 150,205 M 150,205 L 150,295 M 150,295 A 5,5,0,0,1 145,300 M 145,300 L 100,300" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x + 5) + ',' + d.y + 'M' + (des.x + 5) + ',' + d.y + 'A 5,5,0,0,0 ' + des.x + ',' + (d.y + 5) +
                    'M' + des.x + ',' + (d.y + 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y < 0) { //第三象限（200,200-100,100）
                // <path d="M 200,200 L 155,200 M 155,200 A 5,5,0,0,1 150,195 M 150,195 L 150,105 M 150,105 A 5,5,0,0,0 145,100 M 145,100 L 100,100" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x + 5) + ',' + d.y + 'M' + (des.x + 5) + ',' + d.y + 'A 5,5,0,0,1 ' + des.x + ',' + (d.y - 5) +
                    'M' + des.x + ',' + (d.y - 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y < 0) { //第四象限（200,200-300,100）
                // <path d="M 200,200 L 245,200 M 245,200 A 5,5,0,0,0 250,195 M 250,195 L 250,105 M 250,105 A 5,5,0,0,1 255,100 M 255,100 L 300,100" fill="none" stroke="#F18C16" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x - 5) + ',' + d.y + 'M' + (des.x - 5) + ',' + d.y + 'A 5,5,0,0,0 ' + des.x + ',' + (d.y - 5) +
                    'M' + des.x + ',' + (d.y - 5) + 'L' + des.x + ',' + des.y;
            }
        } else { // 上下连线
            if (dif_x > 0 && dif_y > 0) { //第一象限（200,200-300,300） 200,200->200,295->205,300->300,300
                // <path d="M 100,100 L 100,145 M 100,145 A 5,5,0,0,0 105,150 M 105,150 L 195,150 M 195,150 A 5,5,0,0,1 200,155 M 200,155 L 200,200" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y - 5) + 'M' + d.x + ',' + (des.y - 5) + 'A 5,5,0,0,0 ' + (d.x + 5) + ',' + des.y +
                    'M' + (d.x + 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y > 0) { //第二象限（200,200-100,300）
                // <path d="M 200,200 L 200,245 M 200,245 A 5,5,0,0,1 195,250 M 195,250 L 105,250 M 105,250 A 5,5,0,0,0 100,255 M 100,255 L 100,300" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y - 5) + 'M' + d.x + ',' + (des.y - 5) + 'A 5,5,0,0,1 ' + (d.x - 5) + ',' + des.y +
                    'M' + (d.x - 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y < 0) { //第三象限（200,200-100,100）
                // <path d="M 200,200 L 200,155 M 200,155 A 5,5,0,0,0 195,150 M 195,150 L 105,150 M 105,150 A 5,5,0,0,1 100,145 M 100,145 L 100,100" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y + 5) + 'M' + d.x + ',' + (des.y + 5) + 'A 5,5,0,0,0 ' + (d.x - 5) + ',' + des.y +
                    'M' + (d.x - 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y < 0) { //第四象限（200,200-300,100）
                // <path d="M 200,200 L 200,155 M 200,155 A 5,5,0,0,1 205,150 M 205,150 L 295,150 M 295,150 A 5,5,0,0,0 300,145 M 300,145 L 300,100" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y + 5) + 'M' + d.x + ',' + (des.y + 5) + 'A 5,5,0,0,1 ' + (d.x + 5) + ',' + des.y +
                    'M' + (d.x + 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }

        }
        return link;
    };

    /**
     * 获取link样式 [添加线样式 start:连线起点 des:连线终点]
     * 如果 |dif.x| > |dif.y| 左右连线，反之，上下连线
     * 如果 dif.x > 0 && dif.y < 0 第四象限
     * 如果 dif.x > 0 && dif.y > 0 第一象限
     * 如果 dif.x < 0 && dif.y > 0 第二象限
     * 如果 dif.x < 0 && dif.y < 0 第三象限
     */
    GraphCreator.prototype.getLink_d_3 = function (start, des) {
        var d = start;
        var dif_x = des.x - d.x,
            dif_y = des.y - d.y;
        var link;
        var hd = 150;
        if (Math.abs(dif_x) < Math.abs(dif_y)) { // 左右连线
            if (dif_x < 0 && dif_y > 0) { //第一象限（200,100-100,200） 200,100->50,100->50,200->100,200
                // <path d="M 100,100 L 100,145 M 100,145 A 5,5,0,0,0 105,150 M 105,150 L 195,150 M 195,150 A 5,5,0,0,1 200,155 M 200,155 L 200,200" fill="none" stroke="#0096f2" stroke-width="1"></path>
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x - hd + 5) + ',' + d.y + 'M' + (des.x - hd + 5) + ',' + d.y + 'A 5,5,0,0,0 ' + (des.x - hd) + ',' + (d.y + 5) +
                    'M' + (des.x - hd) + ',' + (d.y + 5) + 'L' + (des.x - hd) + ',' + (des.y - 5) +
                    'M' + (des.x - hd) + ',' + (des.y - 5) + 'A 5,5,0,0,0 ' + (des.x - hd + 5) + ',' + (des.y) +
                    'M' + (des.x - hd + 5) + ',' + (des.y) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y < 0) { //第二象限（200,100-100,0） 200,100->50,100->50,0->100,0
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x + hd - 5) + ',' + d.y + 'M' + (des.x + hd - 5) + ',' + d.y + 'A 5,5,0,0,0 ' + (des.x + hd) + ',' + (d.y - 5) +
                    'M' + (des.x + hd) + ',' + (d.y - 5) + 'L' + (des.x + hd) + ',' + (des.y + 5) +
                    'M' + (des.x + hd) + ',' + (des.y + 5) + 'A 5,5,0,0,0 ' + (des.x + hd - 5) + ',' + des.y +
                    'M' + (des.x + hd - 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y < 0) { //第三象限（200,200-100,100） 200,200->50,100->50,0->100,0
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x - hd + 5) + ',' + d.y + 'M' + (des.x - hd + 5) + ',' + d.y + 'A 5,5,0,0,1 ' + (des.x - hd) + ',' + (d.y - 5) +
                    'M' + (des.x - hd) + ',' + (d.y - 5) + 'L' + (des.x - hd) + ',' + (des.y + 5) +
                    'M' + (des.x - hd) + ',' + (des.y + 5) + 'A 5,5,0,0,1 ' + (des.x - hd + 5) + ',' + des.y +
                    'M' + (des.x - hd + 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y > 0) { //第四象限（200,200-300,100）
                link = 'M' + d.x + ',' + d.y + 'L' + (des.x + hd - 5) + ',' + d.y + 'M' + (des.x + hd - 5) + ',' + d.y + 'A 5,5,0,0,1 ' + (des.x + hd) + ',' + (d.y + 5) +
                    'M' + (des.x + hd) + ',' + (d.y + 5) + 'L' + (des.x + hd) + ',' + (des.y - 5) +
                    'M' + (des.x + hd) + ',' + (des.y - 5) + 'A 5,5,0,0,1 ' + (des.x + hd - 5) + ',' + des.y +
                    'M' + (des.x + hd - 5) + ',' + des.y + 'L' + des.x + ',' + des.y;
            }
        } else { // 上下连线
            if (dif_x < 0 && dif_y > 0) { //第一象限（100,100-200,150）
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y + hd - 5) + 'M' + d.x + ',' + (des.y + hd - 5) + 'A 5,5,0,0,1 ' + (d.x - 5) + ',' + (des.y + hd) +
                    'M' + (d.x - 5) + ',' + (des.y + hd) + 'L' + (des.x + 5) + ',' + (des.y + hd) +
                    'M' + (des.x + 5) + ',' + (des.y + hd) + 'A 5,5,0,0,1 ' + des.x + ',' + (des.y + hd - 5) +
                    'M' + des.x + ',' + (des.y + hd - 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y < 0) { //第二象限（200,100-100,0） 200,100->50,100->50,0->100,0
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y - hd + 5) + 'M' + d.x + ',' + (des.y - hd + 5) + 'A 5,5,0,0,1 ' + (d.x + 5) + ',' + (des.y - hd) +
                    'M' + (d.x + 5) + ',' + (des.y - hd) + 'L' + (des.x - 5) + ',' + (des.y - hd) +
                    'M' + (des.x - 5) + ',' + (des.y - hd) + 'A 5,5,0,0,1 ' + des.x + ',' + (des.y - hd + 5) +
                    'M' + des.x + ',' + (des.y - hd + 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x < 0 && dif_y < 0) { //第三象限（200,200-100,100） 200,200->50,100->50,0->100,0
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y - hd + 5) + 'M' + d.x + ',' + (des.y - hd + 5) + 'A 5,5,0,0,0 ' + (d.x - 5) + ',' + (des.y - hd) +
                    'M' + (d.x - 5) + ',' + (des.y - hd) + 'L' + (des.x + 5) + ',' + (des.y - hd) +
                    'M' + (des.x + 5) + ',' + (des.y - hd) + 'A 5,5,0,0,0 ' + des.x + ',' + (des.y - hd + 5) +
                    'M' + des.x + ',' + (des.y - hd + 5) + 'L' + des.x + ',' + des.y;
            }
            if (dif_x > 0 && dif_y > 0) { //第四象限（200,200-300,100）100,100->100,20->200,20->200,150
                link = 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + (des.y + hd - 5) + 'M' + d.x + ',' + (des.y + hd - 5) + 'A 5,5,0,0,0 ' + (d.x + 5) + ',' + (des.y + hd) +
                    'M' + (d.x + 5) + ',' + (des.y + hd) + 'L' + (des.x - 5) + ',' + (des.y + hd) +
                    'M' + (des.x - 5) + ',' + (des.y + hd) + 'A 5,5,0,0,0 ' + des.x + ',' + (des.y + hd - 5) +
                    'M' + des.x + ',' + (des.y + hd - 5) + 'L' + des.x + ',' + des.y;
            }
        }
        return link;
    };

    GraphCreator.prototype.getLink_move = function (start, des) {
        var startType = start.type, desType = des.type;
        var d = start;
        var xSource = d.x, ySource = d.y, xDes = des.x, yDes = des.y;
        var dif_x = des.x - d.x,
            dif_y = des.y - d.y;
        var link;
        if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
            if (dif_x > 0) {
                d.x = d.x + 100;
            } else {
                des.x = des.x + 100;
            }
            d.y = d.y + 25;
            des.y = des.y + 25;
        } else { // 上下连线
            if (dif_y > 0) {
                d.y = d.y + 50;
            } else {
                des.y = des.y + 50;
            }
            d.x = d.x + 50;
            des.x = des.x + 50;
        }
        if (startType == "start") {
            d.x = xSource;
            d.y = ySource;
        }
        if (desType == "end") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_x < 0) {
                    des.x = xDes + 33;
                    des.y = yDes;
                } else {
                    des.x = xDes - 33;
                    des.y = yDes;
                }
            } else { // 上下连线
                if (dif_y < 0) {
                    des.x = xDes;
                    des.y = yDes + 33;
                } else {
                    des.x = xDes;
                    des.y = yDes - 33;
                }
            }
        }
        if (start.type == "flag") {
            d.x = xSource;
            d.y = ySource + 21;
        }
        if (desType == "flag") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_x < 0) {
                    des.x = xDes + 21;
                    des.y = yDes + 21;
                } else {
                    des.x = xDes - 21;
                    des.y = yDes + 21;
                }
            } else { // 上下连线
                if (dif_y < 0) {
                    des.y = yDes + 42;
                }
                des.x = xDes;
            }
        }

    };

    GraphCreator.prototype.getLink_move_w_1 = function (start, des) {
        var startType = start.type, desType = des.type;
        var d = start;
        var xSource = d.x, ySource = d.y, xDes = des.x, yDes = des.y;
        var dif_x = des.x - d.x,
            dif_y = des.y - d.y;
        var link;
        if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
            if (dif_x < 0) {
                des.x = des.x + 100;
            }
            if (dif_y > 0) {
                des.y = des.y + 25;
                d.y = d.y + 50;
            } else {
                des.y = des.y + 25;
            }
            d.x = d.x + 50;

        } else { // 上下连线
            if (dif_y < 0) {
                des.y = des.y + 50;
            }
            if (dif_x > 0) {
                d.x = d.x + 100;
                des.x = des.x + 50;
            } else {

                des.x = des.x + 50;
            }
            d.y = d.y + 25;

        }
        if (startType == "start") {
            d.x = xSource;
            d.y = ySource;
        }
        if (desType == "end") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_x < 0) {
                    des.x = xDes + 33;
                    des.y = yDes;
                } else {
                    des.x = xDes - 33;
                    des.y = yDes;
                }
            } else { // 上下连线
                if (dif_y < 0) {
                    des.x = xDes;
                    des.y = yDes + 33;
                } else {
                    des.x = xDes;
                    des.y = yDes - 33;
                }

            }
        }
        if (startType == "flag") {
            d.x = xSource;
            d.y = ySource + 21;
        }
        if (desType == "flag") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_x < 0) {
                    des.x = xDes + 21;
                    des.y = yDes + 21;
                } else {
                    des.x = xDes - 21;
                    des.y = yDes + 21;
                }
            } else { // 上下连线
                if (dif_y < 0) {
                    des.y = yDes + 42;
                }
                des.x = xDes;
            }
        }

    };

    GraphCreator.prototype.getLink_move_w_2 = function (start, des) {
        var startType = start.type, desType = des.type;
        var d = start;
        var xSource = d.x, ySource = d.y, xDes = des.x, yDes = des.y;
        var dif_x = des.x - d.x,
            dif_y = des.y - d.y;
        var link;
        if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
            if (dif_y < 0) {
                des.y = des.y + 50;
            }
            if (dif_x > 0) {
                d.x = d.x + 100;
                des.x = des.x + 50;
            } else {

                des.x = des.x + 50;
            }
            d.y = d.y + 25;
        } else { // 上下连线
            if (dif_x < 0) {
                des.x = des.x + 100;
            }
            if (dif_y > 0) {
                des.y = des.y + 25;
                d.y = d.y + 50;
            } else {
                des.y = des.y + 25;
            }
            d.x = d.x + 50;
        }
        if (startType == "start") {
            d.x = xSource;
            d.y = ySource;
        }
        if (desType == "end") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_y < 0) {
                    des.x = xDes;
                    des.y = yDes + 33;
                } else {
                    des.x = xDes;
                    des.y = yDes - 33;
                }
            } else { // 上下连线
                if (dif_x < 0) {
                    des.x = xDes + 33;
                    des.y = yDes;
                } else {
                    des.x = xDes - 33;
                    des.y = yDes;
                }
            }
        }
        if (startType == "flag") {
            d.x = xSource;
            d.y = ySource + 21;
        }
        if (desType == "flag") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_y < 0) {
                    des.y = yDes + 42;
                }
                des.x = xDes;
            } else { // 上下连线
                if (dif_x < 0) {
                    des.x = xDes + 21;
                    des.y = yDes + 21;
                } else {
                    des.x = xDes - 21;
                    des.y = yDes + 21;
                }
            }
        }
    };

    GraphCreator.prototype.getLink_move_w_3 = function (start, des) {
        var startType = start.type, desType = des.type;
        var d = start;
        var xSource = d.x, ySource = d.y, xDes = des.x, yDes = des.y;
        var dif_x = des.x - d.x,
            dif_y = des.y - d.y;
        var link;
        if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
            if (dif_y > 0) {
                des.y = des.y + 50;
            }
            des.x = des.x + 50;
            d.x = d.x + 50;
            d.y = d.y + 25;
        } else { // 上下连线
            if (dif_x > 0) {
                des.x = des.x + 100;
            }
            des.y = des.y + 25;
            d.x = d.x + 50;
            d.y = d.y + 25;
        }
        if (startType == "start") {
            d.x = xSource;
            d.y = ySource;
        }
        if (desType == "end") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_y < 0) {
                    des.x = xDes;
                    des.y = yDes - 33;
                } else {
                    des.x = xDes;
                    des.y = yDes + 33;
                }
            } else { // 上下连线
                if (dif_x < 0) {
                    des.x = xDes - 33;
                    des.y = yDes;
                } else {
                    des.x = xDes + 33;
                    des.y = yDes;
                }

            }
        }
        if (startType == "flag") {
            d.x = xSource;
            d.y = ySource + 21;
        }
        if (desType == "flag") {
            if (Math.abs(dif_x) > Math.abs(dif_y)) { // 左右连线
                if (dif_y > 0) {
                    des.y = yDes + 42;
                }
                des.x = xDes;
            } else { // 上下连线
                if (dif_x > 0) {
                    des.x = xDes + 21;
                } else {
                    des.x = xDes - 21;
                }
                des.y = yDes + 21;
            }
        }

    };


    /**
     * 获取此节点的连线
     * @param  {Object} node        此节点
     * @param  {Number} type        -1 连线指向此节点 1 此节点连出 undefined 所有连线
     * @return {Array}  linkedEdges 连线集合
     */
    GraphCreator.prototype.getLinkedEdges = function (node, type) {
        var thisGraph = this;
        var edges = thisGraph.edges;
        var linkedEdges;
        if (type == -1) {
            linkedEdges = edges.filter(function (edge) {
                return edge.target == node;
            });
        }
        if (type == 1) {
            linkedEdges = edges.filter(function (edge) {
                return edge.source == node;
            });
        }
        linkedEdges = edges.filter(function (edge) {
            return edge.target == node || edge.source == node;
        });
        return linkedEdges;
    };

    /**
     * 判断node有无连线
     * @param  {object}  node       节点
     * @param  {Boolean} isActivity 是否是与activity的连线，true 不包括开始和结束节点
     * @param  {Boolean} type       连线类型：-1 指向node 0 所有连线 1 从node连出
     * @return {Boolean}            hasLinked
     */
    GraphCreator.prototype.hasLinked = function (node, isActivity, type) {
        var thisGraph = this;
        isActivity = isActivity || false;
        type = type || 0;
        var edges = [];
        if (isActivity) {
            edges = thisGraph.edges.filter(function (edge, index) {
                return edge.source.type == 'activity' && edge.target.type == 'activity';
            });
        } else {
            edges = thisGraph.edges;
        }
        var hasLinked = edges.some(function (edge, index) {
            if (type == 0) {
                return edge.source.id == node.id || edge.target.id == node.id;
            } else if (type == -1) {
                return edge.target.id == node.id;
            } else if (type == 1) {
                return edge.source.id == node.id;
            }
        });
        return hasLinked;
    };

    /* 连接线的设置 */
    GraphCreator.prototype.dragmove = function (d) {
        var thisGraph = this;
        var drawLine = thisGraph.state.drawLine;
        var link;
        if (thisGraph.state.shiftNodeDrag || drawLine) {
            var svgG = thisGraph.svgG,
                dragLine = thisGraph.dragLine;
            switch (drawLine) {
                case 'NOROUTING': // 直线
                    link = dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + d3.mouse(svgG.node())[0] + ',' + d3.mouse(svgG.node())[1]);
                    break;
                case 'SIMPLEROUTING-1': // 折线
                    var des = {
                        x: d3.mouse(svgG.node())[0],
                        y: d3.mouse(svgG.node())[1]
                    };
                    var link_d = thisGraph.getLink_d_1(d, des);
                    link = dragLine.attr('d', link_d);
                    break;
                case 'SIMPLEROUTING-2': // 折线
                    var des = {
                        x: d3.mouse(svgG.node())[0],
                        y: d3.mouse(svgG.node())[1]
                    };
                    var link_d = thisGraph.getLink_d_2(d, des);
                    link = dragLine.attr('d', link_d);
                    break;
                case 'SIMPLEROUTING-3': // 折线
                    var des = {
                        x: d3.mouse(svgG.node())[0],
                        y: d3.mouse(svgG.node())[1]
                    };
                    var link_d = thisGraph.getLink_d_3(d, des);
                    link = dragLine.attr('d', link_d);
                    break;
            }
            refresh(link); // 兼容IE11
        } else {
            d.x += d3.event.dx;
            d.y += d3.event.dy;
            thisGraph.updateGraph();
        }
    };

    GraphCreator.prototype.deleteGraph = function () {
        var thisGraph = this;
        thisGraph.nodes = [];
        thisGraph.edges = [];
        thisGraph.updateGraph();
    };

    /* select all text in element: taken from http://stackoverflow.com/questions/6139107/programatically-select-text-in-a-contenteditable-html-element */
    GraphCreator.prototype.selectElementContents = function (el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    };


    /* 根据不同的type值，设置不同的文本样式*/
    GraphCreator.prototype.insertTitleLinebreaks = function (gEl, d) {
        var words = d.title.split(/\s+/g),
            nwords = words.length;

        var el = gEl.append("text")
            .attr("x", 50)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("letter-spacing", "1");
        var defs = gEl.append('defs').append('svg:marker');

        switch (d.type) {
            case 'start':
                el.attr("x", 10)
                    .attr("y", 0)
                    .attr("dx", "-10");
            case 'end':
                el.attr("x", 10)
                    .attr("y", 0)
                    .attr("dx", "-10")
                    .attr("dy", "13");
                defs.attr('refX', 40);
                break;
            case 'flag':
                el.attr('x', 0)
                    .attr('y', 32);
            default:
                el.attr("dy", "-" + (nwords - 1) * 7.5);
                break;
        }
        for (var i = 0; i < words.length; i++) {
            var tspan = el.append('tspan').text(words[i]);
            if (i > 0)
                tspan.attr('x', 0).attr('dy', '15');
        }

    };

    // remove edges associated with a node
    GraphCreator.prototype.spliceLinksForNode = function (node) {
        var thisGraph = this,
            toSplice = thisGraph.edges.filter(function (l) {
                return (l.source === node || l.target === node);
            });
        toSplice.map(function (l) {
            thisGraph.edges.splice(thisGraph.edges.indexOf(l), 1);
        });
    };

    GraphCreator.prototype.replaceSelectEdge = function (d3Path, edgeData) {
        var thisGraph = this;
        d3Path.classed(thisGraph.consts.selectedClass, true);
        //修改箭头样式
        // d3Path.style('marker-end', 'url(#selected-end-arrow)');
        if (thisGraph.state.selectedEdge) {
            thisGraph.removeSelectFromEdge();
        }
        thisGraph.state.selectedEdge = edgeData;
    };

    GraphCreator.prototype.replaceSelectNode = function (d3Node, nodeData) {
        // A circle node has been selected.
        var thisGraph = this;
        d3Node.classed(this.consts.selectedClass, true);
        if (thisGraph.state.selectedNode) {
            thisGraph.removeSelectFromNode();
        }
        thisGraph.state.selectedNode = nodeData;
    };

    GraphCreator.prototype.removeSelectFromNode = function () {
        // A circle node has been deselected.

        var thisGraph = this;
        thisGraph.circles.filter(function (cd) {
            return cd.id === thisGraph.state.selectedNode.id;
        }).classed(thisGraph.consts.selectedClass, false);
        thisGraph.state.selectedNode = null;

        d3.selectAll("#inspector").remove();

    };

    GraphCreator.prototype.removeSelectFromEdge = function () {
        var thisGraph = this;
        thisGraph.paths.filter(function (cd) {
            return cd === thisGraph.state.selectedEdge;
        }).classed(thisGraph.consts.selectedClass, false);
        thisGraph.state.selectedEdge = null;
    };

    GraphCreator.prototype.pathMouseDown = function (d3path, d) {
        var thisGraph = this,
            state = thisGraph.state;
        d3.event.stopPropagation();
        state.mouseDownLink = d;

        if (state.selectedNode) {
            thisGraph.removeSelectFromNode();
        }

        var prevEdge = state.selectedEdge;
        if (!prevEdge || prevEdge !== d) {
            thisGraph.replaceSelectEdge(d3path, d);
        } else {
            if (d3.event.button != 2) {
                thisGraph.removeSelectFromEdge();
                // d.style('marker-end', 'url(#end-arrow)');
            }
        }
        if (d3.event.button == 2) {
            thisGraph.showMenu();
            // thisGraph.menuEvent();
        }
    };

    // mousedown on node
    GraphCreator.prototype.circleMouseDown = function (d3node, d) {
        var thisGraph = this,
            state = thisGraph.state;
        d3.event.stopPropagation();
        state.mouseDownNode = d;

        if (d3.event.shiftKey || thisGraph.state.drawLine) {
            var result = thisGraph.isAllowLinking(d);
            if (!result.success) {
                layer.msg(result.msg, {time: 2000, icon: 0, offset: '180px'});
                return;
            }
            // Automatically create node when they shift + drag?
            state.shiftNodeDrag = d3.event.shiftKey;
            // reposition dragged directed edge
            var link = thisGraph.dragLine.classed('hidden', false)
                .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
            refresh(link);// 兼容IE11
            return;
        }
    };

    // mouseup on nodes
    GraphCreator.prototype.circleMouseUp = function (d3node, d) {
        var thisGraph = this,
            state = thisGraph.state,
            consts = thisGraph.consts;
        // reset the states
        state.shiftNodeDrag = false;
        d3node.classed(consts.connectClass, false);

        var mouseDownNode = state.mouseDownNode;
        if (!mouseDownNode) return;

        thisGraph.dragLine.classed("hidden", true);

        if (mouseDownNode !== d) {
            var result = thisGraph.isAllowLinked(d, mouseDownNode);
            if (!result.success) {
                layer.msg(result.msg, {time: 2000, icon: 0, offset: '180px'});
                return;
            }
            // we're in a different node: create new edge for mousedown edge and add to graph
            var newEdge = {
                edgeId: seqer_edgeID.gensym(),
                postCondition: {transitionEventType: 'transitionClass'},
                source: mouseDownNode,
                target: d,
                drawLine: thisGraph.state.drawLine
            };
            var filtRes = thisGraph.paths.filter(function (d) {
                if (d.source === newEdge.target && d.target === newEdge.source) {
                    thisGraph.edges.splice(thisGraph.edges.indexOf(d), 1);
                }
                return d.source === newEdge.source && d.target === newEdge.target;
            });
            if (!filtRes[0].length) {
                thisGraph.edges.push(newEdge);
                thisGraph.updateGraph();
            }
        } else {
            // we're in the same node
            var prevNode = state.selectedNode;
            if (state.justDragged) {
                // dragged, not clicked
                if (state.selectedEdge) {
                    thisGraph.removeSelectFromEdge();
                }
                if (!prevNode || prevNode !== d) {
                    thisGraph.replaceSelectNode(d3node, d);
                    thisGraph.changePropDiv(d); // 添加更改属性div
                } else {
                    // thisGraph.removeSelectFromNode();
                }

            } else {
                // clicked, not dragged
                if (d3.event.shiftKey) {

                } else {
                    if (state.selectedEdge) {
                        thisGraph.removeSelectFromEdge();
                    }
                    if (!prevNode || prevNode !== d) {
                        thisGraph.replaceSelectNode(d3node, d);
                        thisGraph.changePropDiv(d); // 添加更改属性div
                        thisGraph.showMenu();
                        // thisGraph.menuEvent();
                    } else {
                        if (d3.event.button == '2') {
                            thisGraph.showMenu();
                            // thisGraph.menuEvent();
                        } else {
                            thisGraph.removeSelectFromNode();
                        }
                    }
                }
            }
        }
        state.mouseDownNode = null;
        state.justDragged = false;
        return;

    }; // end of circles mouseup

    /**
     * 判断节点是否允许被连线
     * @param  {Object}  mouseDownNode 连线开始节点
     * @param  {Object}  eventNode     连线结束节点
     * @return {Object}                连线是否成功信息
     */
    GraphCreator.prototype.isAllowLinked = function (eventNode, mouseDownNode) {
        var thisGraph = this;
        var result = {
            success: true,
            msg: ''
        };
        switch (eventNode.type) {
            case 'start':
                result.success = false;
                result.msg = '不允许';
                break;
            case 'end':
                if (thisGraph.hasLinked(eventNode)) {
                    result.success = true;
                    // result.msg = '已有连线！';
                }
                break;
        }
        switch (mouseDownNode.type) {
            case 'start':
                if (thisGraph.hasLinked(mouseDownNode)) {
                    result.success = true;
                    //result.msg = '已有连线！';
                }
                break;
            case 'end':
                result.success = false;
                result.msg = '不允许';
                break;
            case 'activity':
                var edges = thisGraph.getLinkedEdges(mouseDownNode, 1);
                var edgeLinkEnd = edges.filter(function (edge) {
                    return edge.target.type == 'end';
                });
                if (edgeLinkEnd.length) {
                    result.success = false;
                    result.msg = '活动不能有转出转移！';
                }
                break;
        }
        return result;
    };

    /**
     * 判断节点是否允许连线
     * @param  {Object}  eventNode 出发实践节点对象
     * @return {Object}            连线是否成功信息
     */
    GraphCreator.prototype.isAllowLinking = function (eventNode) {
        var thisGraph = this;
        var result = {
            success: true,
            msg: ''
        };
        switch (eventNode.type) {
            case 'start':
                if (thisGraph.hasLinked(eventNode)) {
                    result.success = true;
                    //result.msg = '已有连线！';
                }
                break;
            case 'end':
                result.success = false;
                result.msg = '不允许！';
                break;
            case 'activity':
                var edges = thisGraph.getLinkedEdges(eventNode, 1);
                var edgeLinkEnd = edges.filter(function (edge) {
                    return edge.target.type === 'end';
                });
                if (edgeLinkEnd.length) {
                    result.success = false;
                    result.msg = '活动不能有转出转移！';
                }
                break;
        }
        return result;
    };

    //更改属性div
    GraphCreator.prototype.changePropDiv = function (d) {
        var thisGraph = this;
        $('.component-prop').empty().append(
            '<div>' +
            '  <div name="id" class="prop-value"><span>id:</span><span>' + d.id + '</span></div>' +
            '  <div name="name" class="prop-value"><span>名称:</span><span>' + d.title + '</span></div>' +
            '</div>' +
            '<div class="clearfix"></div>' +
            '<div> ' +
            /* '  <div name="type" class="prop-value"><span>类型:</span><span>' + d.component + '</span></div>'+
        '  <div name="desc" class="prop-value"><span>描述:</span><span> ' + d.conventional.description + '</span></div>' +*/
            '</div>' +
            '<div class="clearfix"></div>');
    };

    // 右击显示菜单
    GraphCreator.prototype.showMenu = function () {
        var thisGraph = this;
        $('#flowComponents div[name=selectBtn]').trigger('click');
        thisGraph.circles.style({'cursor': 'default'}); // 防止在活动块上右击存在问题
        var selectedNode = thisGraph.state.selectedNode,
            selectedEdge = thisGraph.state.selectedEdge;
        if (selectedNode) {
            if (selectedNode.type == 'activity' || selectedNode.type == 'start' || selectedNode.type == 'flag') {
                $('#rMenu a[name=propMenu]').show();
                /*if (selectedNode.component == 'blockActivity') {
          $('#rMenu a[name=editMenu]').show();
        } else {
          $('#rMenu a[name=editMenu]').hide();
        }*/
            } else {
                $('#rMenu a[name=propMenu]').hide();
            }
        } else if (selectedEdge) {
            var sourceType = selectedEdge.source.type,
                targetType = selectedEdge.target.type;
            if (targetType == 'end') {
                $('#rMenu a[name=propMenu]').hide();
            } else {
                $('#rMenu a[name=propMenu]').show();
            }
        }
        d3.select("#rMenu").style({
            "top": (d3.event.clientY - 2) + "px",
            "left": (d3.event.clientX - 2) + "px",
            "display": "block"
        });
        d3.select('#rMenu').on('contextmenu', function () {
            d3.event.preventDefault();
        });
    };

    // mousedown on main svg
    GraphCreator.prototype.svgMouseDown = function () {
        this.state.graphMouseDown = true;
    };

    // mouseup on main svg
    GraphCreator.prototype.svgMouseUp = function () {
        var thisGraph = this,
            state = thisGraph.state;
        if (state.justScaleTransGraph) {
            // dragged not clicked
            state.justScaleTransGraph = false;
        } else if (state.graphMouseDown && d3.event.shiftKey) {
            // clicked not dragged from svg
            var xycoords = d3.mouse(thisGraph.svgG.node()),
                d = {
                    id: seqer_nodeID.gensym(),
                    title: '普通活动',
                    desc: $(this).find('Description').html(),
                    component: 'ordinaryActivity',
                    type: 'activity',
                    x: xycoords[0],
                    y: xycoords[1],
                    conventional: {
                        MustActivity: true,
                        taskAssign: 'taskAutoMode',
                        autoAcceptAllAssignments: true,
                        isResponsible: true,
                        startMode: 'manual',
                        finishMode: 'manual'
                    },
                    frontCondition: {},
                    postCondition: {},
                    extendAttr: [],
                    highLevel: {},
                    timeoutLimit: {},
                    monitorinf: {isResponsibleTem: true},
                    eventTypeId: null
                };
            thisGraph.nodes.push(d);
            thisGraph.updateGraph();
        } else if (state.shiftNodeDrag || state.drawLine) {
            // dragged from node
            state.shiftNodeDrag = false;
            thisGraph.dragLine.classed("hidden", true);//win7 IE11下存在bug
        }
        state.graphMouseDown = false;
    };

    // keydown on main svg
    GraphCreator.prototype.svgKeyDown = function () {
        var thisGraph = this,
            state = thisGraph.state,
            consts = thisGraph.consts;
        // make sure repeated key presses don't register for each keydown
        if (state.lastKeyDown !== -1) return;

        state.lastKeyDown = d3.event.keyCode;
        var selectedNode = state.selectedNode,
            selectedEdge = state.selectedEdge;
    };

    GraphCreator.prototype.svgKeyUp = function () {
        this.state.lastKeyDown = -1;
    };

    GraphCreator.prototype.zoomed = function () {
        this.state.justScaleTransGraph = true;
        var translate = this.dragSvg.translate();
        var scale = this.dragSvg.scale();
        if (!translate[0]) translate = [0, 0];
        if (!scale) scale = 1;
        d3.select(".full-right>.tab.active ." + this.consts.graphClass)
            .attr("transform", "translate(" + translate + ") scale(" + scale + ")");
    };

    GraphCreator.prototype.updateWindow = function (svg) {
        var docEl = document.documentElement,
            bodyEl = document.getElementsByTagName('body')[0];
        var x = window.innerWidth || docEl.clientWidth || bodyEl.clientWidth;
        var y = window.innerHeight || docEl.clientHeight || bodyEl.clientHeight;
        svg.attr("width", x).attr("height", y);
    };

    /**
     * 创建子流程graph对象
     */
    GraphCreator.prototype.createSubGraph = function () {
        var thisGraph = this;
        var containerId = d3.select('.full-right>.tab.active').attr('data-tab'),
            activitySetId = d3.select('.full-right>.menu>.item.active').attr('activitysetid');

        var svg = d3.select('.full-right>.tab.active .svg-container').append("svg")
            .attr("width", "100%")
            .attr("height", "100%");
        var editedBlockNode = thisGraph.state.selectedNode;

        var subGraph = editedBlockNode.activitySet.graphCreator;
        var pools = graphPool.pools;
        var isExist = pools.indexOf(subGraph);
        if (isExist === -1) {
            var graph_active;
            if (subGraph) {
                graph_active = new GraphCreator(containerId, svg, subGraph.nodes, subGraph.edges, subGraph.participants);
            } else {
                graph_active = new GraphCreator(containerId, svg, [], [], []);
                editedBlockNode.activitySet.graphCreator = graph_active;
            }
            pools.push(graph_active);
            graphPool.updateGraphActiveById(containerId);
            graph_active.updateGraph();
        }
    };

    GraphCreator.prototype.createNode = function (data) {
        var node;
        switch (data.type) {
            case 'activity':
                node = {
                    id: seqer_nodeID.gensym(),
                    title: data.text,
                    component: data.component,
                    type: data.type,
                    //description:data.description,
                    x: data.x,
                    y: data.y,
                    conventional: {
                        MustActivity: true,
                        taskAssign: 'taskAutoMode',
                        autoAcceptAllAssignments: true,
                        isResponsible: true,
                        candidateGroup: null,
                        assignee: null,
                        groupCandidates: [],
                        startMode: 'manual',
                        finishMode: 'manual'
                    },
                    frontCondition: {},
                    postCondition: {},
                    extendAttr: [],
                    highLevel: {},
                    timeoutLimit: {},
                    monitorinf: {isResponsibleTem: true},
                    eventTypeId: null
                };
                break;
            case 'flag':
                node = {
                    id: seqer_nodeID.gensym(),
                    title: data.text,
                    component: data.component,
                    type: data.type,
                    //description:data.description,
                    x: data.x,
                    y: data.y,
                    conventional: {
                        MustActivity: true,
                        taskAssign: 'taskAutoMode',
                        autoAcceptAllAssignments: true,
                        isResponsible: true,
                        startMode: 'manual',
                        finishMode: 'manual'
                    },
                    frontCondition: {},
                    postCondition: {},
                    extendAttr: [],
                    highLevel: {},
                    timeoutLimit: {},
                    monitorinf: {isResponsibleTem: true},
                    eventTypeId: null
                };
                break;
            case 'start':
                node = {
                    id: seqer_nodeID.gensym(),
                    title: data.text,
                    component: data.component,
                    type: data.type,
                    //description:data.description,
                    x: data.x,
                    y: data.y,
                    conventional: {
                        MustActivity: true,
                        taskAssign: 'taskAutoMode',
                        autoAcceptAllAssignments: true,
                        isResponsible: true,
                        startMode: 'manual',
                        finishMode: 'manual'
                    },
                    frontCondition: {},
                    postCondition: {},
                    extendAttr: [],
                    highLevel: {},
                    timeoutLimit: {},
                    monitorinf: {isResponsibleTem: true},
                    eventTypeId: null
                };
                if (data.component == 'blockActivity') {
                    node.activitySet = {
                        activitySetId: seqer_blockId.gensym(),
                        graphCreator: null
                    };
                }
                break;
            default: // 开始、结束节点
                node = {
                    id: generateUUID(),
                    title: data.text,
                    component: data.component,
                    type: data.type,
                    x: data.x,
                    y: data.y
                };
                break;
        }
        return node;
    };

    // call to propagate changes to graph
    GraphCreator.prototype.updateGraph = function () {
        var thisGraph = this,
            consts = thisGraph.consts,
            state = thisGraph.state,
            nodes = thisGraph.nodes,
            edges = thisGraph.edges;

        thisGraph.paths = thisGraph.paths.data(edges, function (d) {
            return String(d.source.id) + "+" + String(d.target.id);
        });
        var paths = thisGraph.paths;
        // update existing paths
        var link = paths.style('marker-end', 'url(#' + thisGraph.containerId + '-end-arrow)')
            .classed(consts.selectedClass, function (d) {
                return d === state.selectedEdge;
            })
            .attr("conditype", function (d) {
                if (d.postCondition) {
                    return changeCase(d.postCondition.conditype, 5);
                } else {
                    return '';
                }
            })
            .attr("d", function (d) {
                if (d.drawLine == 'NOROUTING') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move(start, des);
                    return "M" + start.x + "," + start.y + "L" + des.x + "," + des.y;
                }
                if (d.drawLine == 'SIMPLEROUTING-1') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_1(start, des);
                    return thisGraph.getLink_d_1(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-2') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_2(start, des);
                    return thisGraph.getLink_d_2(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-3') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_3(start, des);
                    return thisGraph.getLink_d_3(start, des);
                }
            });
        refresh(link); // 兼容IE11

        // add new paths
        paths.enter()
            .append("path")
            .style('marker-end', 'url(#' + thisGraph.containerId + '-end-arrow)')
            .classed("link", true)
            .attr("conditype", function (d) {
                if (d.postCondition) {
                    return changeCase(d.postCondition.conditype, 5);
                } else {
                    return '';
                }
            })
            .attr("d", function (d) {
                if (d.drawLine == 'NOROUTING') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move(start, des);
                    return "M" + start.x + "," + start.y + "L" + des.x + "," + des.y;
                }
                if (d.drawLine == 'SIMPLEROUTING-1') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_1(start, des);
                    return thisGraph.getLink_d_1(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-2') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_2(start, des);
                    return thisGraph.getLink_d_2(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-3') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_3(start, des);
                    return thisGraph.getLink_d_3(start, des);
                }
            })
            .on("mousedown", function (d) {
                thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function (d) {
                state.mouseDownLink = null;
            });

        // remove old links
        paths.exit().remove();

        // update existing nodes
        thisGraph.circles = thisGraph.circles.data(nodes, function (d) {
            return d.id;
        });
        thisGraph.circles.attr("transform", function (d) {
            if (d == state.selectedNode) { // 更新节点名称
                var tspan = d3.select(this).select('tspan');
                if (tspan.text() !== d.title) {
                    tspan.text(d.title);
                }
            }
            return "translate(" + d.x + "," + d.y + ")";
        });

        // add new nodes
        var newGs = thisGraph.circles.enter()
            .append("g")
            .attr({
                "id": function (d) {
                    return generateUUID();
                }
            });

        newGs.classed(consts.circleGClass, true)
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("mouseover", function (d) {
                if (state.shiftNodeDrag) {
                    d3.select(this).classed(consts.connectClass, true);
                }
            })
            .on("mouseout", function (d) {
                d3.select(this).classed(consts.connectClass, false);
            })
            .on("mousedown", function (d) {
                thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function (d) {
                thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
            })
            .call(thisGraph.drag);
        if (thisGraph.state.type == "start" || thisGraph.state.type == "end") {
            newGs.append("circle")
                .attr("r", String(consts.nodeRadius));
        } else if (thisGraph.state.type == "flag") {
            newGs.append("rect")
                .attr("width", 30)
                .attr("height", 30)
                .attr("transform", "rotate(45)");
        } else {
            newGs.append("rect")
                .attr("width", 100)
                .attr("height", 50)
                .attr("rx", 10)
                .attr("ry", 10);
        }

        newGs.each(function (d) {
            switch (d.type) {
                case 'start':
                    d3.select(this).classed('start', true);
                    break;
                case 'end':
                    d3.select(this).classed('end', true);
                    break;
                case 'flag':
                    d3.select(this).classed('flag', true);
            }
            thisGraph.insertTitleLinebreaks(d3.select(this), d);
        });

        // remove old nodes
        thisGraph.circles.exit().remove();

    };

    GraphCreator.prototype.importJSONGraph = function () {
        var thisGraph = this,
            consts = thisGraph.consts,
            state = thisGraph.state,
            nodes = thisGraph.nodes,
            edges = thisGraph.edges;

        thisGraph.paths = thisGraph.paths.data(edges, function (d) {
            return String(d.source.id) + "+" + String(d.target.id);
        });
        var paths = thisGraph.paths;
        // update existing paths
        var link = paths.style('marker-end', 'url(#' + thisGraph.containerId + '-end-arrow)')
            .classed(consts.selectedClass, function (d) {
                return d === state.selectedEdge;
            })
            .attr("conditype", function (d) {
                if (d.postCondition) {
                    return changeCase(d.postCondition.conditype, 5);
                } else {
                    return '';
                }
            })
            .attr("d", function (d) {
                if (d.drawLine == 'NOROUTING') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move(start, des);
                    return "M" + start.x + "," + start.y + "L" + des.x + "," + des.y;
                }
                if (d.drawLine == 'SIMPLEROUTING-1') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_1(start, des);
                    return thisGraph.getLink_d_1(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-2') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_2(start, des);
                    return thisGraph.getLink_d_2(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-3') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_3(start, des);
                    return thisGraph.getLink_d_3(start, des);
                }
            });
        refresh(link); // 兼容IE11

        // add new paths
        paths.enter()
            .append("path")
            .style('marker-end', 'url(#' + thisGraph.containerId + '-end-arrow)')
            .classed("link", true)
            .attr("conditype", function (d) {
                if (d.postCondition) {
                    return changeCase(d.postCondition.conditype, 5);
                } else {
                    return '';
                }
            })
            .attr("d", function (d) {
                if (d.drawLine == 'NOROUTING') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move(start, des);
                    return "M" + start.x + "," + start.y + "L" + des.x + "," + des.y;
                }
                if (d.drawLine == 'SIMPLEROUTING-1') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_1(start, des);
                    return thisGraph.getLink_d_1(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-2') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_2(start, des);
                    return thisGraph.getLink_d_2(start, des);
                }
                if (d.drawLine == 'SIMPLEROUTING-3') {
                    var start = {
                        x: d.source.x,
                        y: d.source.y,
                        type: d.source.type
                    };
                    var des = {
                        x: d.target.x,
                        y: d.target.y,
                        type: d.target.type
                    };
                    thisGraph.getLink_move_w_3(start, des);
                    return thisGraph.getLink_d_3(start, des);
                }
            })
            .on("mousedown", function (d) {
                thisGraph.pathMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function (d) {
                state.mouseDownLink = null;
            });

        // remove old links
        paths.exit().remove();

        // update existing nodes
        thisGraph.circles = thisGraph.circles.data(nodes, function (d) {
            return d.id;
        });

        // var svgG = thisGraph.svgG;

        thisGraph.circles.attr("transform", function (d) {
            if (d == state.selectedNode) { // 更新节点名称
                var tspan = d3.select(this).select('tspan');
                if (tspan.text() !== d.title) {
                    tspan.text(d.title);
                }
            }
            return "translate(" + d.x + "," + d.y + ")";
        });


        // add new nodes
        var newGs = thisGraph.circles.enter()
            .append("g")
            .attr({
                "id": function (d) {
                    return generateUUID();
                }
            });

        newGs.classed(consts.circleGClass, true)
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("mouseover", function (d) {
                if (state.shiftNodeDrag) {
                    d3.select(this).classed(consts.connectClass, true);
                }
            })
            .on("mouseout", function (d) {
                d3.select(this).classed(consts.connectClass, false);
            })
            .on("mousedown", function (d) {
                thisGraph.circleMouseDown.call(thisGraph, d3.select(this), d);
            })
            .on("mouseup", function (d) {
                thisGraph.circleMouseUp.call(thisGraph, d3.select(this), d);
            })
            .call(thisGraph.drag);

        newGs.each(function (d) {
            switch (d.type) {
                case 'start':
                    d3.select(this).classed('start', true);
                    break;
                case 'end':
                    d3.select(this).classed('end', true);
                    break;
                case 'flag':
                    d3.select(this).classed('flag', true);
                    break;
                case 'activity':
                    d3.select(this).classed('activity', true);
            }
            thisGraph.insertTitleLinebreaks(d3.select(this), d);
        });

        d3.selectAll(".conceptG.start")
            .append("circle")
            .attr("r", String(consts.nodeRadius));
        d3.selectAll(".conceptG.end")
            .append("circle")
            .attr("r", String(consts.nodeRadius));
        d3.selectAll(".conceptG.activity")
            .append("rect")
            .attr("width", 100)
            .attr("height", 50)
            .attr("rx", 10)
            .attr("ry", 10);
        d3.selectAll(".conceptG.flag")
            .append("rect")
            .attr("width", 30)
            .attr("height", 30)
            .attr("transform", "rotate(45)");

        newGs.each(function (d) {
            switch (d.type) {
                case 'start':
                    d3.select(this).classed('start', true);
                    break;
                case 'end':
                    d3.select(this).classed('end', true);
                    break;
                case 'flag':
                    d3.select(this).classed('flag', true);
            }
            thisGraph.insertTitleLinebreaks(d3.select(this), d);
        });

        // remove old nodes
        thisGraph.circles.exit().remove();
        //thisGraph.bpmnStr = createBpmn();
    };


    /**** MAIN ****/
    var container = d3.select('[data-tab="tab_main"] .svg-container').node(),
        containerId = 'tab_main';

    var svg = d3.select('[data-tab="tab_main"] .svg-container').append("svg")
        .attr("width", "100%")
        .attr("height", container.clientHeight);

    var initialDate = initFlowChart();
    window.graph_main = new GraphCreator(containerId, svg, initialDate.nodes, initialDate.edges, initialDate.participants);
    graphPool.pools.push(graph_main);
    graph_main.updateGraph();
    initCommonEvent();

    //获取请求参数,访问后台json
    requestParam();

})(window.d3, window.saveAs, window.Blob, vkbeautify);

function requestParam(){
    /**
     * var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)"); //构造一个含有目标参数的正则表达式对象
     var r = window.location.search.substr(1).match(reg);
     * @type {string}
     */
    var reg = new RegExp("(^|&)id=([^&]*)(&|$)");
    var url=location.search.substr(1).match(reg);
    var param=url[2];
    if(url!=null && param != null){
        console.log("param:"+param);
        $.ajax({
            url:"http://workflow.ucarinc.com:8080/api/bpmn/getBpmnJson.do_",
            type:"post",
            data:'id='+param,
            dataType: 'json',
            success:function(data){
                if(data.re.retCode == "200"){
                    handleImport(data.re.data);
                }else{
                    console.log("BpmnJsonData is empty")
                }
            },error:function(){

            }
        })
    }else{
        return;
    }
}

function initCommonEvent() {
    $('.editor-toolbar').on('click', '.sign.in,.sign.out', handleImportOrExport);
    //$('.editor-toolbar .open .icon').on('click',openFileBtn);
    $('.full-right').on('click', '.full-right-btn .item', handleViews);
    $('.editor-toolbar #delete-ele').on('click', handleDeleteNode);
    $('.editor-toolbar #zoom-enlarge,#zoom-narrow').on('click.zoom', handleClickZoom);
    $("#reset-zoom").on("click", resetZoom);
    $('#helper').on('click', handleHelp);
    $('#flowComponents .components-btn').on('click', handleComponentsBtn);
    $("#delete-graph").on("click", clearGraph);
    $('.editor-toolbar .icon.save').on('click', downloadBpmn);
    $('#rMenu .item').on('click', handleRightMenu);
    //$('.full-left [name=addStartEndBtn]').on('click', handleAddStartEnd);
}

function initFlowChart() {
    var initialDate = {
        nodes: [],
        edges: [],
        participants: []
    };
    // if (create_type == 'create') return;
    if (create_type == 'Show') {
        $.ajax({ // handle=Show&id=Package_njyaCNBY&type=xpdl&onlycode=23653VB5&fornocache=KXW33813
            url: "../wfdurl/urlConfig.do",
            type: "post",
            async: false,
            data: {
                "handle": create_type,
                "id": package_id,
                "type": 'xpdl',
                "onlycode": '23653VB5',
                "fornocache": 'KXW33813'
            },
            dataType: "html",
            success: function (result) {
                initialDate = importXpdl(result);
            },
            error: function (data) {
                alert("服务器繁忙,请稍后再试...");
            }
        });
    }
    return initialDate;
}

//根据xpdl格式还原流程图
function importXpdl(str) {
    str = vkbeautify.xmlmin(str);
    var nodes = [],
        edges = [],
        initialDate = {},
        error = {
            messages: []
        };

    while ((str = str.replace(":", "_")) && (str.indexOf(":") > -1)) ;
    var root = $("<ROOT>" + str + "</ROOT>");
    if (!root.find("WorkflowProcess").length) {
        error.messages.push("XPDL:WorkflowProcess node not found");
        console.error(error.messages);
        return false;
    }

    var nodesId_seq = [], // node id 序列数组
        edgesId_seq = [], // edge id 序列数组
        participants = []; // 参与者集
    // 活动加入nodes
    root.find("Activities Activity").each(function () {
        var id = $(this).attr('id'),
            name = $(this).attr('name'),
            //desc = $(this).attr('description'),
            x = parseInt($(this).find('ExtendedAttribute[name=XOffset]').attr('Value')),
            y = parseInt($(this).find('ExtendedAttribute[name=YOffset]').attr('Value'));

        var syncType = $(this).find('ExtendedAttribute[name=syncType]').attr('Value');
        var responsible = $(this).find('ExtendedAttribute[name=responsible]').attr('Value');
        var conventional = { // 常规
                startMode: $(this).find('StartMode').html().replace(/<(\w+)>.+/g, function (match, p1) {
                    return p1;
                }),
                finishMode: $(this).find('FinishMode').html().replace(/<(\w+)>.+/g, function (match, p1) {
                    return p1;
                }),
                isMulInstance: $(this).find('ExtendedAttribute[name=isMulInstance]').attr('Value'),
                isResponsible: $(this).find('ExtendedAttribute[name=isResponsible]').attr('Value'), // true or false
                autoAcceptAllAssignments: $(this).find('ExtendedAttribute[name=autoAcceptAllAssignments]').attr('Value'), // true or false
                completeAllAssignments: $(this).find('ExtendedAttribute[name=completeAllAssignments]').attr('Value'),
                assignmentsOrder: $(this).find('ExtendedAttribute[name=assignmentsOrder]').attr('Value'),
                // conventional_definition_group : $('.conventional input[name="conventional_definition_group"]').val(),
                //conventional_definition_name : $('.conventional input[name="conventional_definition_name"]').val(),
                formKey: $(".five.wide.field").find("select[name=formKey] option:selected").val(),
                taskListener: $(".five.wide.field").find("select[name=taskListener] option:selected").val(),
                taskEvent: $(".five.wide.field").find("select[name=taskEvent] option:selected").val(),
                globalListener: "",
                conventional_definition_group: $('.five.wide.field').find("select[name=conventional_definition_group] option:selected").val(),
                conventional_definition_name: $('.five.wide.field').find("select[name=conventional_definition_name] option:selected").val(),
                //description: $(this).find('Description').html(),
                taskAssignMode: $(this).find('ExtendedAttribute[name=taskAssignMode]').attr('Value'),
                mustActivity: $(this).find('ExtendedAttribute[name=MustActivity]').attr('Value'), // true or false
                participantID: $(this).find('ExtendedAttribute[name=ParticipantID]').attr('Value'),
                performer: $(this).find('Performer').html()
            },
            frontCondition = { // 前置条件
                convergeType: $(this).find('TransitionRestriction Join').attr('Type'),
                isCreateNew: $(this).find('ExtendedAttribute[name=isCreateNew]').attr('Value'),
                voteModel: syncType && syncType.split('|')[0],
                voteText: syncType && syncType.split('|')[1] || ''
            },
            timeoutLimit = { // 超时限制
                limitTime: $(this).find('Limit').html(),
                warnTime: $(this).find('ExtendedAttribute[name=warnTime]').attr('Value'),
                warnAgentClassName: $(this).find('ExtendedAttribute[name=warnAgentClassName]').attr('Value'),
                limitAgentClassName: $(this).find('ExtendedAttribute[name=LimitAgentClassName]').attr('Value'),
                deadline: []
            },
            highLevel = { // 高级
                activityEndEvent: $(this).find('ExtendedAttribute[name=ActivityEndEvent]').attr('Value'),
                activityCreateEvent: $(this).find('ExtendedAttribute[name=ActivityCreateEvent]').attr('Value'),
                finishRule: $(this).find('ExtendedAttribute[name=FinishRule]').attr('Value')
            },
            monitorinf = { // 监控信息
                isResponsibleTem: $(this).find('ExtendedAttribute[name=isResponsibleTem]').attr('Value'),
                responsible: responsible && responsible.split(',') || ''
            };
        $(this).find('Deadline').each(function () {
            var json_obj = {
                execution: $(this).attr('Execution'),
                deadlineCondition: $(this).find('DeadlineCondition').html(),
                exceptionName: $(this).find('ExceptionName').html()
            };
            timeoutLimit.deadline.push(JSON.stringify(json_obj));
        });

        var extendAttr = []; // 扩展属性集
        $(this).find('ExtendedAttribute[name=YOffset]').nextAll().each(function () {
            var json_obj = {
                id: $(this).attr('id'),
                name: $(this).attr('name'),
                variable: $(this).attr('Variable'),
                type: $(this).attr('type')
            };
            extendAttr.push(JSON.stringify(json_obj));
        });

        var d = {
            id: id,
            title: name,
            //component要根据xpdl确定---未修改
            component: name == '普通活动' ? 'ordinaryActivity' : name == '块活动' ? 'blockActivity' : name == '子活动' ? 'subFlowActivity' : name == '路径活动' ? 'routeActivity' : '',
            type: 'activity',
            x: x,
            y: y,
            conventional: conventional,
            frontCondition: frontCondition,
            postCondition: {},
            extendAttr: extendAttr,
            timeoutLimit: timeoutLimit,
            highLevel: highLevel,
            monitorinf: monitorinf,
            eventTypeId: null
        };
        nodes.push(d);

        var result = /_Act([0-9]+)$/.exec(id);
        nodesId_seq.push(result[1]);

    });
    //活动之间连线加入edges
    root.find("Transitions Transition").each(function () {
        var from_actId = $(this).attr('From'),
            to_actId = $(this).attr('To'),
            edgeId = $(this).attr('Id'),
            drawLine = $(this).find('[name=RoutingType]').attr('Value'),
            transitionEventType = $(this).find('[name=TransitionEventType]').attr('Value'),
            sFlowListener = $(this).find("select[name=sFlowListener] option:selected").val();
        var edge = {
            edgeId: edgeId,
            postCondition: {transitionEventType: transitionEventType},
            drawLine: drawLine,
            sFlowListener: sFlowListener
        };

        nodes.forEach(function (node, i) {
            if (node.id == from_actId) {
                edge.source = nodes[i];
            }
            if (node.id == to_actId) {
                edge.target = nodes[i];
            }
        });
        edges.push(edge);
        var result = /_Tra([0-9]+)$/.exec(edgeId);
        edgesId_seq.push(result[1]);
    });
    if (edgesId_seq.length) {// 重新设置edge id 序列后缀
        var seq = maxArr(edgesId_seq) + 1;
        seqer_edgeID.set_seq(seq);
    }
    //开始、结束的node及开始、结束连接的edge--------------------------有改动 未测试
    var regExp_act = /_Act([0-9]+)$/;
    root.find('WorkflowProcess>ExtendedAttributes ExtendedAttribute[name$=OfWorkflow]').each(function () {
        var label_name = $(this).attr('name');
        var label_vals = $(this).attr('Value').split(';');
        var d = {
            id: label_vals[0],
            /*title: '开始',
              component: 'startComponent',
              type: 'start',*/
            x: parseFloat(label_vals[2]),
            y: parseFloat(label_vals[3]),
            eventTypeId: null
        };
        switch (label_name) {
            case 'StartOfWorkflow':
                d.title = '开始';
                d.component = 'startComponent';
                d.type = 'start';
                nodes.push(d);

                var result = regExp_act.exec(label_vals[0]);
                nodesId_seq.push(result[1]);
                if (label_vals[1] != -1) {
                    nodes.forEach(function (node, i) {
                        if (node.id == label_vals[1]) {
                            var edge = {
                                edgeId: seqer_edgeID.gensym(),
                                drawLine: label_vals[4],
                                source: nodes[nodes.length - 1],
                                target: node
                            };
                            edges.push(edge);
                        }
                    });
                }
                break;
            case 'EndOfWorkflow':
                d.title = '结束';
                d.component = 'endComponent';
                d.type = 'end';
                nodes.push(d);

                var match = regExp_act.exec(label_vals[0]);
                nodesId_seq.push(match[1]);
                if (label_vals[1] != -1) {
                    nodes.forEach(function (node, i) {
                        if (node.id == label_vals[1]) {
                            var edge = {
                                edgeId: seqer_edgeID.gensym(),
                                drawLine: label_vals[4],
                                source: node,
                                target: nodes[nodes.length - 1]
                            };
                            edges.push(edge);
                        }
                    });
                }
                break;
        }
    });

    if (nodesId_seq.length) {// 重新设置 node id 序列后缀
        seqer_nodeID.set_seq(maxArr(nodesId_seq) + 1);
    }

    //参与者集
    root.find("Participants Participant").each(function () {
        var participant = {
            conventional_definition_id: $(this).attr('Id'),
            conventional_definition_name: $(this).attr('Name'),
            conventional_definition_description: $(this).find('Description').html(),
            conventional_definition_participant: $(this).find('ExtendedAttribute[name=PartyBeanId]').attr('Value'),
            typeName: [],
            isAppData: [],
            itemName: [],
            itemValue: [],
            secLevelS: [],
            secLevelE: [],
            condition: [],
            conditionXml: [],
            roleName: []
        };
        $(this).find('ExtendedAttributes ExtendedAttribute').each(function () {
            var value = $(this).attr('Value') || $(this).html();
            participant[$(this).attr('Name')] = value.split(',');
        });

        participants.push(participant);
    });

    initialDate.nodes = nodes;
    initialDate.edges = edges;
    initialDate.participants = participants;
    return initialDate;
}

/**
 * svg
 * refresh 连线兼容IE11
 * @param  {[type]} link [改变attr后的dragLine]
 *
 */
function refresh(link) {
    if (/(MSIE 10)|(Trident)/.test(navigator.appVersion)) {
        if (link[0] instanceof Array) {
            link[0].forEach(function (item) {
                item.parentNode.insertBefore(item, item);
            });
        } else if (link[0]) {
            var svgNode = link.node();
            svgNode.parentNode.insertBefore(svgNode, svgNode);
        }
    }
}
