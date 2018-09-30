/**
 * 生成bpmn文件
 */
function createBpmn(){
  graph_main.bpmnStr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:activiti="http://activiti.org/bpmn" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:tns="http://www.activiti.org/testm1533999566823" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" expressionLanguage="http://www.w3.org/1999/XPath" id="m1533999566823" name="" targetNamespace="http://www.activiti.org/testm1533999566823" typeLanguage="http://www.w3.org/2001/XMLSchema">\n';
  var processBpmn = '<process id="myProcess_1" isClosed="false" isExecutable="true" name="leave" processType="None">\n\t';
  var bpmndi = '<bpmndi:BPMNDiagram documentation="background=#3C3F41;count=1;horizontalcount=1;orientation=0;width=842.4;height=1195.2;imageableWidth=832.4;imageableHeight=1185.2;imageableX=5.0;imageableY=5.0" id="Diagram-_1" name="New Diagram">\n';
  var nodes = graph_main.nodes.concat();
  var edges = graph_main.edges.concat();
  var bpmnId = 0;
  var start_bpmn = "";
  var end_bpmn = "";
  var ordinaryActivity_bpmn = "";
  var routeActivity_bpmn = "";
  bpmndi += '<bpmndi:BPMNPlane bpmnElement="myProcess_1">\n';
  nodes.forEach(function (node) {
    //alert("node:"+JSON.stringify(node));
      node.id = "_"+bpmnId++;
      node.choseId = bpmnId++;
      if(node.type=="start"){
          var globalListener = node.conventional.globalListener;
          if(globalListener!=null&&globalListener!="")
          {
              var startListener = '<activiti:executionListener event="start" class="'+globalListener+'"> \n</activiti:executionListener>\n';
              var endListener = '<activiti:executionListener event="end" class="'+globalListener+'"> \n</activiti:executionListener>\n';
              start_bpmn += ' <extensionElements>\n'+startListener+endListener+'</extensionElements>';
          }
          start_bpmn += '<startEvent id="'+node.id+'" name="StartEvent">\n' +
                judgeDocument(node.conventional.description)+
                judgeFormList(node.extendAttr)+'</startEvent>\n\t';
          bpmndi += '<bpmndi:BPMNShape bpmnElement="'+node.id+'" id="Shape-'+node.id+'">\n' +
              '        <dc:Bounds height="32.0" width="32.0" x="'+node.x+'" y="'+node.y+'"/>\n' +
              '        <bpmndi:BPMNLabel>\n' +
              '          <dc:Bounds height="32.0" width="32.0" x="0.0" y="0.0"/>\n' +
              '        </bpmndi:BPMNLabel>\n' +
              '      </bpmndi:BPMNShape>\n';
      }
      else if(node.type=="end"){
          end_bpmn += '<endEvent id="'+node.id+'" name="EndEvent"/>\n\t';
          bpmndi += '<bpmndi:BPMNShape bpmnElement="'+node.id+'" id="Shape-'+node.id+'">\n' +
              '        <dc:Bounds height="32.0" width="32.0" x="'+node.x+'" y="'+node.y+'"/>\n' +
              '        <bpmndi:BPMNLabel>\n' +
              '          <dc:Bounds height="32.0" width="32.0" x="0.0" y="0.0"/>\n' +
              '        </bpmndi:BPMNLabel>\n' +
          '      </bpmndi:BPMNShape>\n';
      }else if(node.type=="activity"){
          var userName = node.conventional.conventional_definition_name;
          //var userGroup = node.conventional.conventional_definition_group;
          var formKey = node.conventional.formKey;
          var taskListner = node.conventional.taskListener;
          var taskEvent = null;

          var userTask = '<userTask activiti:exclusive="true" id="'+node.id+'" name="'+node.title+'"';
          if(userName!=null&&userName!=''){
              userTask += ' activiti:assignee="' + userName + '"';
          }
          if(formKey!=null&&formKey!='1'){
              userTask += ' activiti:formKey="'+formKey+'"';
          }
          userTask += '>';
          if(taskListner!=null&&taskListner!="empty"){
              taskEvent = node.conventional.taskEvent;
              userTask += ' <extensionElements>\n<activiti:taskListener event="'+taskEvent+'" class= "'+taskListner+'"> \n</activiti:taskListener>\n</extensionElements>';
          }
          ordinaryActivity_bpmn += userTask + '\n\t';
          ordinaryActivity_bpmn +=
                judgeDocument(node.conventional.description) +
                judgeFormList(node.extendAttr) +
                '       </userTask>\n\t';
          bpmndi += '<bpmndi:BPMNShape bpmnElement="'+node.id+'" id="Shape-'+node.id+'">\n' +
              '        <dc:Bounds height="55.0" width="85.0" x="'+node.x+'" y="'+node.y+'"/>\n' +
              '        <bpmndi:BPMNLabel>\n' +
              '          <dc:Bounds height="55.0" width="85.0" x="0.0" y="0.0"/>\n' +
              '        </bpmndi:BPMNLabel>\n' +
              '      </bpmndi:BPMNShape>\n';
      }else if(node.type == 'flag'){
          routeActivity_bpmn += '<exclusiveGateway id="'+node.id+'" name="Exclusive Gateway">\n' +
              judgeDocument(node.conventional.description) +
              '     </exclusiveGateway>\n';
          bpmndi += '<bpmndi:BPMNShape bpmnElement="'+node.id+'" id="Shape-'+node.id+'">\n' +
              '        <dc:Bounds height="55.0" width="85.0" x="'+node.x+'" y="'+node.y+'"/>\n' +
              '        <bpmndi:BPMNLabel>\n' +
              '          <dc:Bounds height="55.0" width="85.0" x="0.0" y="0.0"/>\n' +
              '        </bpmndi:BPMNLabel>\n' +
              '      </bpmndi:BPMNShape>\n';
      }
  });
    processBpmn += start_bpmn+end_bpmn+ordinaryActivity_bpmn+routeActivity_bpmn;

/*
* 箭头生成相关bpmn文件
* */
    edges.forEach(function (edge) {
      edge.edgeId = "_"+bpmnId++;
      var source = edge.source;
      var target = edge.target;
      var name = edge.postCondition.edgeName;
      //var condition = edge.postCondition.conditionData;
      var sFlowListener = edge.sFlowListener;
      var sFlowListenerXML = "";
      if(sFlowListener!=null&&sFlowListener!="")
          sFlowListenerXML = ' <extensionElements>\n<activiti:executionListener event="take" class= "'
                +sFlowListener+'"> \n</activiti:executionListener>\n</extensionElements>';

      if(name != null && name != ''){
          processBpmn += '<sequenceFlow id="'+edge.edgeId+'" name=" '+ name +' " sourceRef="'+source.id+'" targetRef="'+target.id+'">\n\t';
      }else {
          processBpmn += '<sequenceFlow id="'+edge.edgeId+'" sourceRef="'+source.id+'" targetRef="'+target.id+'">\n\t';
      }
      processBpmn += sFlowListenerXML+judgeCondition(edge.postCondition.conditionData) + judgeDocument(edge.postCondition.description);
      processBpmn += '</sequenceFlow>';

      bpmndi += '<bpmndi:BPMNEdge bpmnElement="'+edge.edgeId+'" id="BPMNEdge_'+edge.edgeId+'" sourceElement="'+source.id+'" targetElement="'+target.id+'">\n' + '        <di:waypoint x="'+source.x+'" y="'+source.y+'"/>\n' +
        '        <di:waypoint x="'+target.x+'" y="'+target.y+'"/>\n' +
        '        <bpmndi:BPMNLabel>\n' +
        '          <dc:Bounds height="0.0" width="0.0" x="0.0" y="0.0"/>\n' +
        '        </bpmndi:BPMNLabel>\n' +
        '      </bpmndi:BPMNEdge>\n';
      });


  processBpmn += '</process>\n';
  bpmndi += '</bpmndi:BPMNPlane>\n' +
      '  </bpmndi:BPMNDiagram>\n';
    graph_main.bpmnStr += processBpmn;
    graph_main.bpmnStr += bpmndi;
    graph_main.bpmnStr += '</definitions>';
   //console.log("bpmnStr" + graph_main.bpmnStr);
  return graph_main.bpmnStr;
}

/**
 *  下拉选择Listenner
 */
function getListener()
{
    var names = new Array();
    $.ajax({
        url:"http://localhost:8080/getListener",
        type:"GET",
        async:false,
        dataType: 'json',
        success:function(data){

            names = data.names;
        }
    })
    return names;
}
function setListener(listenerType,listener) {
    var listenerSelect = $("#"+listenerType);
    var listeners = getListener();
    if(listener==null)
    {
        listenerSelect.append("<option value='empty'>空</option>");
        for(i=0;i<listeners.length;i++) {
            listenerSelect.append("<option value='" + listeners[i] + "'>" + listeners[i] + "</option>");
        }
    }
    else {
        listenerSelect.append("<option value='empty'>空</option>");
        for(i=0;i<listeners.length;i++) {
            listenerSelect.append("<option value='" + listeners[i] + "'>" + listeners[i] + "</option>");
        }
        listenerSelect.val(listener);
    }
}

function getGroupAndCandidate(){
    var jsonObject;
    $.ajax({
        type:"GET",
        async:false,
        url:"http://localhost:8080/Candidate/getGroup",
        dataType:"json",
        success:function (json) {
          jsonObject=json;
          console.log('jsonObject');
            console.log(jsonObject);
        },
        error:function () {
        },
    });
    return jsonObject;
}

/**
 *  下拉选择FormKey
 */
function getFormKey(){
    $.ajax({
        type: "GET",   // get post 方法都是一样的  
        async: false,
        url: "http://localhost:8080/getFileName",
        dataType: "json",
        success: function(json){
            var names = json.names.split(",");
            var formSelect = $(".five.wide.field").find("select[name=formKey]");
            formSelect.html("");
            formSelect.append("<option value='1'>空</option>");
            names.forEach(function (form) {
                    formSelect.append("<option value='"+form+"'>"+form+"</option>");
                });
        },
        error: function(){
        }
    });
}


/*
* 活动描述部分(documentation)
* */
function judgeDocument(desc){
    if(desc != null && desc !=''){
        return '<documentation>'+ desc + '</documentation>\n';
    }else{
        return '';
    }
}

/*
* 转移条件判断
* */
function judgeCondition(exp){
    if (exp != '' && exp != null){
        return '<conditionExpression xsi:type="tFormalExpression"><![CDATA[${' +exp+ '}]]></conditionExpression>\n';
    } else{
        return '';
    }
}

/*
* 动态表单设置
* */
function judgeFormList(arr) {
    if(arr.length > 0){
        var str = '';
        var pre= '          <extensionElements>\n';
        var pos ='          </extensionElements>\n';
        for(var i = 0; i<arr.length;i++) {
            str += '           <activiti:formProperty ' +
                'id= "' + JSON.parse(arr[i]).id + '" name="' + JSON.parse(arr[i]).name + '" type="' + JSON.parse(arr[i]).type + '"' +
                ' variable="' + JSON.parse(arr[i]).variable + '"/>'
        }
        return str = pre + str + pos;
    }else{
        return '';
    }
}

/*
* 下载功能模块
* */
function downloadBpmn(){
    export_raw('test.bpmn',graph_main.bpmnStr);
}

function fake_click(obj) {
    var ev = document.createEvent("MouseEvents");
    ev.initMouseEvent(
        "click", true, false, window, 0, 0, 0, 0, 0
        , false, false, false, false, 0, null
    );
    obj.dispatchEvent(ev);
}
function export_raw(name, data) {
    var urlObject = window.URL || window.webkitURL || window;

    var export_blob = new Blob([data]);

    var save_link = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    save_link.href = urlObject.createObjectURL(export_blob);
    save_link.download = name;
    fake_click(save_link);
}
/*

function judgeLength(desc){
    if(desc != null && desc != ''){
        return '<documentation>'+ desc + ' </documentation>';
    }else{
        return '';
    }
}
*/

/**
 * 所属组下拉选项
 * 菜单二级联动
 */
candidates = new Object();
var groupNamesList=[];
var candidateNamesList=[];
var jsonObject=getGroupAndCandidate();
console.log(jsonObject);
var groupSelect=$(".five.wide.field").find("select[name=conventional_definition_group]");
$.each(jsonObject,function (it) {
    groupNamesList.push(it);
    candidateNamesList.push(jsonObject[it])
});
for(var i=0;i<groupNamesList.length;i++){
    candidates[groupNamesList[i]]=new Array(candidateNamesList[i]);
    groupSelect.append("<option value='"+groupNamesList[i]+"'>"+groupNamesList[i]+"</option>");
}
function getGroups() {
    var group_name=document.getElementById('groups');
    var candidate_name=document.getElementById('conventional_definition_name');
    var groupCandidate=candidateNamesList[group_name.selectedIndex-1];

    candidate_name.length = 1;//清除其他选项，只保留第一个option
    var ass=groupCandidate.length;
    if(ass!=null){
        for(var i=0;i<ass;i++){
            candidate_name.options[i+1]=new Option(groupCandidate[i],groupCandidate[i]);
        }
    }


}
/*
* 导入bpmn文件
* */
function openFileBtn() {
    var inputObj=document.createElement('input');
    inputObj.setAttribute('id','file');
    inputObj.setAttribute('type','file');
    inputObj.setAttribute('name','file');
    inputObj.setAttribute("style",'visibility:hidden');
    document.body.appendChild(inputObj);
    inputObj.value;
    inputObj.click();
    console.log(inputObj);
}

/**
 * 工具栏-json数据导入/导出功能
 */
function handleImportOrExport(e) {
    alert("e:"+JSON.stringify(e));
  var isImport = e.target.className.indexOf('in'),
      textarea = $('.json_data textarea');
    $('.ui.modal.json_data').modal({
      onApprove: function() {
        if (isImport !== -1) { // 导入
          var jsonStr = textarea.val();
          if (jsonStr) {
            var jsonObj = JSON.parse(jsonStr);
            jsonObj = edgeAssociateNode(jsonObj);
            graph_main.nodes = graph_main.nodes.concat(jsonObj.nodes);
            graph_main.edges = graph_main.edges.concat(jsonObj.edges);
            graph_main.updateGraph();
          }
        }
      },
      onHidden: function() {
        textarea.val('');
      }
    })
    .modal('setting', 'transition', 'scale')
    .modal('show');

    var element_header = $('div.json_data .header');
    if (isImport !== -1) {
      element_header.text('导入数据');
    } else {
      element_header.text('导出数据');
      var data = {
        nodes: graph_main.nodes,
        edges: graph_main.edges
      };
      textarea.val(JSON.stringify(data));
    }
  }

/**
 * 工具栏-清空
 */
function clearGraph() {
  layer.confirm('确认清空？', {
    icon: 0,
    btn: ['确定','取消'],
    offset: '180px'
  }, function() {
    var pools = graphPool.pools;
    for (var i = 0; i < pools.length; i++) {
      var id = pools[i].containerId;
      switch (id) {
        case 'tab_main':
          pools[i].deleteGraph();
          break;
        default:
          $('.full-right [data-tab='+id+']').remove();
          pools.splice(i, 1);
          break;
      }
    }
    layer.msg('删除成功', {icon: 1, offset: '180px', time: 600});
  }, function() {
    
  });
  
}

/**
 * 工具栏-删除节点
 */
function handleDeleteNode() {
  var graph_active = graphPool.getGraphByActiveEdit();
  var selectedNode = graph_active.state.selectedNode,
    selectedEdge = graph_active.state.selectedEdge;
  if (!selectedNode && !selectedEdge) {
    layer.msg('请选中元素！', {time: 2000, icon: 0, offset: '180px'});
    return;
  } else {
    layer.confirm('确定要删除选择元素吗？', {
      icon: 0,
      btn: ['确定','取消'],
      offset: '180px'
    }, function() {
      if (selectedNode) {
        var nodes = graph_active.nodes;
        nodes.splice(nodes.indexOf(selectedNode), 1);
        graph_active.spliceLinksForNode(selectedNode);
        if (selectedNode.component === 'blockActivity') {
          var containerId = 'tab_'+selectedNode.id;
          $('.full-right [data-tab='+containerId+']').remove();
          graphPool.removeGraphFromPools(containerId);
        }
        selectedNode = null;
        graph_active.updateGraph();
      } else if (selectedEdge) {
        var edges = graph_active.edges;
        edges.splice(edges.indexOf(selectedEdge), 1);
        selectedEdge = null;
        graph_active.updateGraph();
      }
      layer.msg('删除成功', {icon: 1, offset: '180px', time: 600});
    }, function() {
      
    });
  }
}

/**
 * 工具栏-放大/缩小按钮 scale(0.3-2)
 */
function handleClickZoom() {
  var graph_active = graphPool.getGraphByActiveEdit();
  var translate = graph_active.dragSvg.translate(),
    scale = graph_active.dragSvg.scale(),
    extent = graph_active.dragSvg.scaleExtent(),
    direction = 1,
    factor = 0.1;
  direction = (this.id === 'zoom-enlarge') ? 1 : -1;
  if ((scale <= extent[0] && direction < 0) || (scale >= extent[1] && direction > 0)) {
    return;
  } else {
    scale = parseFloat(scale) + factor * direction;
  }
  graph_active.dragSvg.scale(scale)
      .translate(translate);
  graph_active.zoomed();
}

/**
 * 工具栏-还原缩放及归位
 */
function resetZoom() {
  var graph_active = graphPool.getGraphByActiveEdit();
  graph_active.svgG.transition() // start a transition
    .duration(1000) // make it last 1 second
    .attr('transform', 'translate(0,0) scale(1)');
  graph_active.dragSvg.scale(1);
  graph_active.dragSvg.translate([0,0]);
}

/**
 * 工具栏-帮助
 */
function handleHelp() {
  if ($('.layer_notice').length) return;
  layer.open({
    type: 1,
    shade: false,
    title: false, // 不显示标题
    offset: ['91px', '394px'],
    content: '<ul class="layer_notice">'+
             '  <li><a href="javascript:;">1. 将左侧活动拖至编辑区</a></li>'+
             '  <li><a href="javascript:;">2. 选中"转移"或"自转移"，编辑区活动之间连线</a></li>'+
             '  <li><a href="javascript:;">3. 右击活动和线都有自己的属性 </a></li>'+
             '</ul>',
    cancel: function() {
      // console.log('helper closed!');
    }
  });
}

/**
 * 左侧组件
 */
function handleComponentsBtn() {
  $(this).siblings().removeClass('active').end().addClass('active');
  var graph_active = graphPool.getGraphByActiveEdit(),
    state = graph_active.state,
    nodeName = $(this).attr('name'),
    container = $('.svg-container');
  if (nodeName === 'NOROUTING' || nodeName === 'SIMPLEROUTING-1'|| nodeName === 'SIMPLEROUTING-2'|| nodeName === 'SIMPLEROUTING-3') {
    state.drawLine = nodeName;
    container.on('mouseover mouseout', '.conceptG', function(e) {
      if (e.type === 'mouseover') {
        this.style.cursor = 'crosshair';
      } else if (e.type == 'mouseout') {
        this.style.cursor = 'default';
      }
    });
  } else {
    container.off('mouseover mouseout', '.conceptG');
    state.drawLine = null;
  }
}

/**
 * 视图显示Tab（图标视图、Xpdl视图、Xml视图）
 */
function handleViews() {
  var dataTab = $(this).attr('data-tab');
  var element = $('.full-right>.tab.active .content-div');
  var activitysetid = $('.full-right>.menu>.item.active').attr('activitysetid');
  switch (dataTab) {
 /*   case 'second':
      var xpdlContent = graph_main.emergeAllxpdlContent();
      $('#xpdlContainer xmp').empty().text(xpdlContent);
      element.mCustomScrollbar("update");
      break;*/
    case 'third':
      createBpmn();
      var XmlContent = graph_main.emergeAllXmlContent();
      $('#xmlContainer xmp').empty().text(XmlContent);
      break;
  }

}/*var isSubGraphXpdlView = /Package_(.+)_second/.test(dataTab);
  if (isSubGraphXpdlView) {
    var blockActivity = graph_main.findActByActSetId(activitysetid);
    var subGraph = blockActivity.activitySet.graphCreator;
    var activitySet = graph_main.emergeActivitySet.call(subGraph, activitysetid);
    activitySet = vkbeautify.xml('<ActivitySet>' + activitySet + '</ActivitySet>');
    element.find('xmp').empty().text(activitySet);
    element.mCustomScrollbar("update");
  }*/

/*function handleSave() {
  var dataTab = $('.full-right-btn .item.active').attr('data-tab');
  $('.tab[data-tab="tab_main"] .item').not($('.full-right-btn .item.active')).trigger('click'); // 触发点击事件获取xpdl和xml
  $('.full-right-btn .item[data-tab="' + dataTab + '"]').trigger('click');
  var xpdl = $('#xpdlContainer xmp').text();
  var xml = $('#xmlContainer xmp').text();
  var xpdl_top = /!*下面这一块应该可以从WfDSystemConfig.xml中获取，发现Applet与xml中有差别*!/
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
    '   <Package xmlns="http://www.wfmc.org/2002/XPDL1.0" xmlns:xpdl="http://www.wfmc.org/2002/XPDL1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Id="' + package_id + '" Name="新包" xsi:schemaLocation="http://www.wfmc.org/2002/XPDL1.0 http://wfmc.org/standards/dtd/TC-1025_schema_10_xpdl.xsd">' +
    '       <PackageHeader>' +
    '           <XPDLVersion>1.0</XPDLVersion>' +
    '           <Vendor>GENTLESOFT</Vendor>' +
    '           <Created>' + create_time + '</Created>' +
    '       </PackageHeader>' +
    '       <RedefinableHeader PublicationStatus="UNDER_TEST">' +
    '           <Author>管理员</Author>' +
    '           <Version>1.0</Version>' +
    '       </RedefinableHeader>' +
    '       <ConformanceClass GraphConformance="NON_BLOCKED"/>' +
    '       <Script Type="text/javascript"/>' +
    '       <DataFields>' +
    '           <DataField Id="sourceReferenceId" IsArray="FALSE" Name="sourceReferenceId">' +
    '               <DataType>' +
    '                   <BasicType Type="STRING"/>' +
    '               </DataType>' +
    '               <InitialValue>null</InitialValue>' +
    '           </DataField>' +
    '           <DataField Id="formId" IsArray="FALSE" Name="formId">' +
    '               <DataType>' +
    '                   <BasicType Type="STRING"/>' +
    '               </DataType>' +
    '               <InitialValue>null</InitialValue>' +
    '           </DataField>' +
    '           <DataField Id="nextActivityInfo" IsArray="FALSE" Name="nextActivityInfo">' +
    '               <DataType>' +
    '                   <ExternalReference location="org.gentlesoft.wf.NextActivitiesParty"/>' +
    '               </DataType>' +
    '               <InitialValue>null</InitialValue>' +
    '           </DataField>' +
    '           <DataField Id="nextActivityName" IsArray="FALSE" Name="nextActivityName">' +
    '               <DataType>' +
    '                   <ExternalReference location="java.util.ArrayList"/>' +
    '               </DataType>' +
    '               <InitialValue>null</InitialValue>' +
    '           </DataField>' +
    '           <DataField Id="formType" IsArray="FALSE" Name="formType">' +
    '               <DataType>' +
    '                   <BasicType Type="STRING"/>' +
    '               </DataType>' +
    '               <InitialValue>null</InitialValue>' +
    '           </DataField>' +
    '       </DataFields>';
  var xpdl_end = 
    '       <ExtendedAttributes>'+
    '           <ExtendedAttribute Name="MadeBy" Value="com.gentlesoft.tools.wfd"/>' +
    '           <ExtendedAttribute Name="Version" Value="1.4.2"/>' +
    '       </ExtendedAttributes>' +
    '   </Package>';
  var xml_top = '<?xml version="1.0" encoding="UTF-8"?><pkg-config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Id="' + package_id + '" Name="新包" Version="" xsi:noNamespaceSchemaLocation="../dtd/flowactconfig.xsd">';
  var xml_end = '</pkg-config>';
  xpdl = vkbeautify.xml(xpdl_top + xpdl + xpdl_end);
  xml = vkbeautify.xml(xml_top + xml + xml_end);
  $('input[name=xpdlcontent]').val(xpdl);
  $('input[name=xmlcontent]').val(xpdl);
  $('#containerForm').submit();
}*/

/**
 * 右击菜单编辑
 */
/*function handleMenuEdit() {
  var graph_active = graphPool.getGraphByActiveEdit();
  var selectedNode = graph_active.state.selectedNode;
  var data = {
      id: selectedNode.id,
      activitySetId: selectedNode.activitySet.activitySetId
    };
  var full_right = $('.full-right'),
    menu = full_right.children('.menu'),
    tab = full_right.find('.tab.active'),
    curr_tab = menu.find('[data-tab="tab_'+ data.id + '"]');
  if (curr_tab.length) {
    full_right.find('[data-tab=tab_' + data.id + ']').show();
    curr_tab.trigger('click');
  } else { // 创建标签页及graph对象
    menu.append(juicer($('#blockActiEdi_item_tpl').html(), data));
    full_right.append(juicer($('#blockActiEdi_tab_tpl').html(), data));
    menu.find('.item').tab();
    menu.find('[data-tab="tab_' + data.id + '"]').trigger('click');
    tab.find('.full-right-btn .item').tab();
    tab.find('.content-div').mCustomScrollbar();
    graph_active.createSubGraph();
  }
}*/

/*
* 右击菜单属性
* */
function handleNodeMenuProp() {
  var graph_active = graphPool.getGraphByActiveEdit();
  var selectedNode = graph_active.state.selectedNode;
  $('.ui.modal.prop_node').modal({
    autofocus: false,
    closable: false,
    onApprove: function() {
      //更新-扩展属性
      selectedNode.extendAttr = [];
      $('.extended_attr:visible tbody tr').each(function() {
        var jsonstr = $(this).attr('jsonstr');
        selectedNode.extendAttr.push(jsonstr);
      });

      //更新-高级 属性
      /*selectedNode.highLevel = {};
      var highLevel = {};
      $('.prop_node .highLevel').find('input').each(function() {
        highLevel[$(this).attr('name')] = $(this).val();
      });
      selectedNode.highLevel = highLevel;
      //更新-超时限制
      $('.timeout_limit').find('input[name], select[name]').each(function() {
        selectedNode.timeoutLimit[$(this).attr('name')] = $(this).val();
      });
      selectedNode.timeoutLimit.deadline = [];
      $('.timeout_limit tbody tr').each(function() {
        var jsonstr = $(this).attr('jsonstr');
        selectedNode.timeoutLimit.deadline.push(jsonstr);
      });
      //更新-后置条件
      graph_active.updatePostCondi('.post_condition');
      //更新-前置条件
      selectedNode.frontCondition = {};
      $('.front_condition > div:not(".hideDiv")').find('input:not(:radio)[name], select').each(function() {
        selectedNode.frontCondition[$(this).attr('name')] = $(this).val();
      });*/
      //更新-工具

      //更新-常规
      selectedNode.conventional = {};
      var conventional = {};
      $('.prop_node .conventional').find('input[name], textarea, select').each(function() {
        conventional[$(this).attr('name')] = $(this).val();
      });
      if (conventional.ID != selectedNode.id) {
        selectedNode.id = conventional.ID;
      }
      if (conventional.name != selectedNode.title) {
        selectedNode.title = conventional.name;
      }
      conventional.taskListener = $('.conventional').find("select[name=taskListener] option:selected").val();
      selectedNode.conventional = conventional;
      graph_active.updateGraph();
    },
    onShow: function() {
      var node = selectedNode;
      //展示-监控信息
      /*$('.monitorinf select[name="isResponsibleTem"]').dropdown('set selected', node.monitorinf.isResponsibleTem);
      var responsible = node.monitorinf.responsible;
      if (responsible && responsible.length) {
        var tr = '';
        responsible.forEach(function(resp) {
          graph_active.participants.forEach(function(participant) {
            if (resp == participant.conventional_definition_id) {
              tr += participant.conventional_definition_name?'<tr definition_id="'+resp+'"><td>'+(participant.conventional_definition_name+'-rol')+'</td></tr>':
                '<tr  definition_id="'+resp+'"><td>'+(resp+'-rol')+'</td></tr>';
            }
          });
        });
        $('.monitorinf tbody').append(tr);
      }
      //展示-高级
      $('.highLevel').find('input').each(function() {
        for (var i in node.highLevel) {
          if ($(this).attr('name') == i) {
            $(this).val(node.highLevel[i]);
          }
        }
      });
      //展示-超时限制
      $('.timeout_limit').find('input').each(function() {
        for (var i in node.timeoutLimit) {
          if ($(this).attr('name') == i) {
            $(this).val(node.timeoutLimit[i]);
          }
        }
      });
      $('.timeout_limit').find('select').each(function() {
        for (var i in node.timeoutLimit) {
          if ($(this).attr('name') == i) {
            $(this).dropdown('set selected', node.timeoutLimit[i]);
          }
        }
      });
      var deadline_strs = node.timeoutLimit.deadline;
      if (deadline_strs && deadline_strs.length) {
        var d_tr = '';
        deadline_strs.forEach(function(deadline_str){
          var deadline_obj = JSON.parse(deadline_str);
          d_tr += '<tr jsonstr= '+deadline_str+'><td>'+deadline_obj.deadlineCondition+'</td></tr>';
        });
        $('.timeout_limit tbody').append(d_tr);
      }*/
      //展示-扩展属性集
      var extendAttr_strs = node.extendAttr;
      if (extendAttr_strs && extendAttr_strs.length) {
        var e_tr = '';
        extendAttr_strs.forEach(function(extendAttr_str) {
          var extendAttr_obj = JSON.parse(extendAttr_str);
          var data = {
            data: extendAttr_obj,
            jsonstr: extendAttr_str
          };
          e_tr += juicer($('#extended_attr_tpl').html(), data);
        });
        $('.extended_attr tbody').append(e_tr).find('.ui.checkbox').checkbox();
      }
      //展示-后置条件
      $('.post_condition .targetActivity').html($('#transition_tpl').html());
      $('.post_condition .targetActivity .menu .item').tab();
      $(".targetActivity .transferInf_extended_attr .postCondi_extendedAttr").mCustomScrollbar();
      $('.targetActivity .conditionList,.conditionList2').mCustomScrollbar();
      var postCondition = {targetActivities: []};
      var edges_act = graph_active.edgesLinkAcivity();
      edges_act.forEach(function(edge) {
        if (edge.source == node) {
          postCondition.targetActivities.push({'activity': edge.target, 'transition': edge});
        }
      });
      if (postCondition.targetActivities.length > 0) {
        $('.post_condition .targetActivity').removeClass('invisible');
        $('.post_condition select[name="splitType"]').parent().removeClass('disabled');
        if (postCondition.targetActivities.length > 1) {
          var splitType = graph_active.state.selectedNode.postCondition.splitType || 'XOR';
          $('.post_condition select[name="splitType"]').parent().dropdown('set selected', splitType);
        } else {
          $('.post_condition select[name="splitType"]').parent().addClass('disabled');
        }
        postCondition.targetActivities.forEach(function(targetActivity) {// 目标活动展示
          $('.post_condition .list').append('<div class="item" acivityId="'+targetActivity.activity.id+'" jsonstr='+JSON.stringify(targetActivity.transition)+'>'+
                                            '    <div class="content">'+
                                            '        <div class="">'+targetActivity.activity.title+'</div>'+
                                            '    </div>'+
                                            '</div>');
        });
        $('.post_condition .list').on('click', '.item', function() {// 点击目标活动
          $(this).addClass('active').siblings().removeClass('active');
          var transition = JSON.parse($(this).attr('jsonstr'));
          graph_active.showTransition('.post_condition', transition);
        });
        $('.post_condition .list .item').eq(0).trigger('click');
      } else {
        $('.post_condition .targetActivity').addClass('invisible');
        $('.post_condition select[name="splitType"]').parent().addClass('disabled');
      }
      /*
      //展示-前置条件
      var frontCondition = node.frontCondition;
      if (frontCondition.convergeType) {
        $('.front_condition .dropdown.convergeType').dropdown('set selected', frontCondition.convergeType);
        $('.front_condition select[name=syncType]').dropdown('set selected', frontCondition.syncType || "");
        $('.front_condition input[name=voteText]').val(frontCondition.voteText || "");
        if (frontCondition.isCreateNew == "true") {
          $('.front_condition input[tabindex="true"]').parent().checkbox('check');
        } else if (frontCondition.isCreateNew == "false") {
          $('.front_condition input[tabindex="false"]').parent().checkbox('check');
        }
      }*/
      //展示-工具

      //展示-常规
      var conventional = node.conventional;
      var taskListener = conventional.taskListener;
      setListener("taskListener",taskListener);//显示监听器下拉菜单
      getFormKey();
      $('.conventional').find('input[name], textarea').each(function() {
        for (var key in conventional) {
          if (key == $(this).attr('name')) {
            $(this).val(conventional[key]);
          }
        }
      });
      $('.conventional').find('select').not($('input[name="definition_role"]')).each(function() {
        for (var key in conventional) {
          if (key == $(this).attr('name')) {
            $(this).dropdown('set selected', conventional[key]);
          }
        }
      });
      $('.conventional').find('.checkbox').each(function() {
        var value = $(this).find('input[name]').val();
        if (value && value !="false") $(this).checkbox('check');
      });
      $('.conventional input[name=ID]').val(node.id);
      $('.conventional input[name=name]').val(node.title);
      if (conventional.performer) {
        $('.conventional select[name="definition_role"]').dropdown('set text', conventional.participantID || '');
        $('.conventional .dropdown .text').attr('definition_id', conventional.performer);
      }
      //监控信息-是否为临时监控
      /*$('.monitorinf select[name="isResponsibleTem"]').on('change', function() {
        var node = graph_active.state.selectedNode;
        node.monitorinf.isResponsibleTem = $(this).val();
      });*/
      //常规-参与者集
      $('.conventional .definition_field').on('click', function() {
        var participants = graph_active.participants;
        var options ='<option value="">请选择</option><option value="0">(空)</option>';
        participants.forEach(function(participant) {
          var rol = participant.conventional_definition_name ? participant.conventional_definition_name + "-rol" : participant.conventional_definition_id + "-rol";
          options += '<option value="' + participant.conventional_definition_id + '">' + rol + '</option>';
        });
        $('.conventional select[name="definition_role"]').empty().append(options);
      });
      //常规-参与者集-下拉菜单
      $('.conventional .definition_field').on('click', '.item', function() {
        var definition_id = $(this).attr('data-value') != "0" ? $(this).attr('data-value') : '';
        $('.conventional select[name="definition_role"]').siblings('.text').attr('definition_id', definition_id);
      });
    },
    onHidden: function() {
      $('.prop_node .menu .item[data-tab="one"]').trigger('click');
      $('.monitorinf select[name="isResponsibleTem"]').off('change'); // 弹窗关闭，避免清空表单时触发事件
      $(this).find('input, textarea').val('');
      $(this).find('.ui.dropdown').dropdown('clear');
      $(this).find('.ui.checkbox').checkbox('uncheck');
      $('.monitorinf tbody').empty(); // 清空监控信息
      $('.timeout_limit tbody').empty(); // 清空监控信息
      $('.extended_attr tbody').empty(); // 清空扩展属性集
      $('.post_condition .list').empty(); // 清空后置条件
      $('.post_condition .targetActivity').html('');
      $('.conventional select[name="definition_role"]').siblings('.text').removeAttr('definition_id');
      $('.conventional select[name="taskListener"]').empty();//清空监听器，防止生成的其他任务节点直接获得该监听器设置
    }
  }).modal('show');
    $('.prop_node>.menu a[data-tab="five"]').addClass('hideitem');
  if(selectedNode.title == '普通活动'){
      $('.prop_node>.menu a[data-tab="five"]').removeClass('hideitem');
  }
}
/*
* 右击判断条件属性
* */
function handleFlagMenuProp() {
    var graph_active = graphPool.getGraphByActiveEdit();
    var selectedNode = graph_active.state.selectedNode;
    $('.ui.modal.prop_flag').modal({
        autofocus: false,
        closable: false,
        onApprove: function() {
            //更新-常规
            selectedNode.conventional = {};
            var conventional = {};
            $('.prop_node .conventional').find('input[name], textarea, select').each(function() {
                conventional[$(this).attr('name')] = $(this).val();
            });
            if (conventional.ID != selectedNode.id) {
                selectedNode.id = conventional.ID;
            }
            if (conventional.name != selectedNode.title) {
                selectedNode.title = conventional.name;
            }
            selectedNode.conventional = conventional;
            graph_active.updateGraph();
        },
        onShow: function() {
            var node = selectedNode;
            //展示-常规
            var conventional = node.conventional;
            $('.conventional').find('input[name], textarea').each(function() {
                for (var key in conventional) {
                    if (key == $(this).attr('name')) {
                        $(this).val(conventional[key]);
                    }
                }
            });
            $('.conventional input[name=ID]').val(node.id);
            $('.conventional input[name=name]').val(node.title);
        },
        onHidden: function() {
            $('.prop_node .menu .item[data-tab="one"]').trigger('click');
            $('.monitorinf select[name="isResponsibleTem"]').off('change'); // 弹窗关闭，避免清空表单时触发事件
            $(this).find('input, textarea').val('');
            $(this).find('.ui.dropdown').dropdown('clear');
            $(this).find('.ui.checkbox').checkbox('uncheck');
        }
    }).modal('show');

}

/*
* 开始节点右击属性
* */
function handleStartMenuProp() {
    var graph_active = graphPool.getGraphByActiveEdit();
    var selectedNode = graph_active.state.selectedNode;
    $('.ui.modal.prop_start').modal({
        autofocus: false,
        closable: false,
        onApprove: function() {
            //更新-常规
            selectedNode.conventional = {};
            var conventional = {};
            $('.prop_start .conventional').find('input[name], textarea, select').each(function() {
                conventional[$(this).attr('name')] = $(this).val();
            });
            if (conventional.ID != selectedNode.id) {
                selectedNode.id = conventional.ID;
            }
            if (conventional.name != selectedNode.title) {
                selectedNode.title = conventional.name;
            }
            conventional.globalListener = $(this).find("select[name=globalListener] option:selected").val();
            selectedNode.conventional = conventional;
            graph_active.updateGraph();
            //更新-扩展属性
            selectedNode.extendAttr = [];
            $('.extended_attr:visible tbody tr').each(function() {
                var jsonstr = $(this).attr('jsonstr');
                selectedNode.extendAttr.push(jsonstr);
            });
        },
        onShow: function() {
            var node = selectedNode;
            //展示-常规
            var conventional = node.conventional;
            var globalListener = conventional.globalListener;
            setListener("globalListener",globalListener);
            $('.conventional').find('input[name], textarea').each(function() {
                for (var key in conventional) {
                    if (key == $(this).attr('name')) {
                        $(this).val(conventional[key]);
                    }
                }
            });
            $('.conventional input[name=ID]').val(node.id);
            $('.conventional input[name=name]').val(node.title);
            //展示-扩展属性集
            var extendAttr_strs = node.extendAttr;
            if (extendAttr_strs && extendAttr_strs.length) {
                var e_tr = '';
                extendAttr_strs.forEach(function(extendAttr_str) {
                    var extendAttr_obj = JSON.parse(extendAttr_str);
                    var data = {
                        data: extendAttr_obj,
                        jsonstr: extendAttr_str
                    };
                    e_tr += juicer($('#extended_attr_tpl').html(), data);
                });
                $('.extended_attr tbody').append(e_tr).find('.ui.checkbox').checkbox();
            }
        },
        onHidden: function() {
            $('.prop_start .menu .item[data-tab="one"]').trigger('click');
            $('.monitorinf select[name="isResponsibleTem"]').off('change'); // 弹窗关闭，避免清空表单时触发事件
            $(this).find('input, textarea').val('');
            $(this).find('.ui.dropdown').dropdown('clear');
            $(this).find('.ui.checkbox').checkbox('uncheck');
            $('.extended_attr tbody').empty(); // 清空扩展属性集
            $(this).find("select[name=globalListener]").empty();//清空当前面板上的监听器
        }
    }).modal('show');
    $('.prop_start>.menu a[data-tab="global_two"]').addClass('hideitem');
    if(selectedNode.title == 'S'){
        $('.prop_start>.menu a[data-tab="global_two"]').removeClass('hideitem');
    }

}
/*
* 连接线右击属性
* */
function handleEdgeMenuProp() {
    var graph_active = graphPool.getGraphByActiveEdit();
    var selectedEdge = graph_active.state.selectedEdge;
    var edgeSource = selectedEdge.source;
    var sFlowListener = $("#sFlowListener").val();
    if(sFlowListener==null||sFlowListener=="")
    {
        $('.prop_edge .targetActivity').html($('#transition_tpl').html());
        $('.prop_edge .targetActivity .menu .item').tab();
        $(".targetActivity .transferInf_extended_attr .postCondi_extendedAttr").mCustomScrollbar();
        $('.targetActivity .conditionList,.conditionList2').mCustomScrollbar();
    }


    $('.ui.modal.prop_edge').modal({
        autofocus: false,
        closable: false,
        onApprove: function() {
            //更新-转移属性
            graph_active.updatePostCondi('.prop_edge');
        },
        onShow: function() {
            if(edgeSource.type!="flag")
                $('.transition div[name="transition_condition"]').remove();//仅当该转移的source为判断条件时才有转移条件设置，否则移除
            //展示-后置条件
            graph_active.showTransition('.prop_edge', selectedEdge);
            var sFlowListener = selectedEdge.sFlowListener;
            setListener("sFlowListener",sFlowListener);//显示监听器设置菜单
        },
        onHidden: function() {
            $('.transition select[name="sFlowListener"]').empty();//清空监听器
        }
    }).modal('show');
}
/*
* 连接线右击菜单
* */
function handleRightMenu() {
  var graph_active = graphPool.getGraphByActiveEdit();
  var item = $(this).attr('name');
  var selectedNode = graph_active.state.selectedNode,
  selectedEdge = graph_active.state.selectedEdge;

  switch (item) {
    case 'removeMenu':
      handleDeleteNode();
      break;
      case 'propMenu':
          if (selectedNode) {
              if(selectedNode.type == 'activity'){
                  handleNodeMenuProp();
              }
              if(selectedNode.type=="flag"){
                  handleFlagMenuProp();
              }
              if(selectedNode.type=="start"){
                  handleStartMenuProp();
              }
          } else if (selectedEdge) {
              handleEdgeMenuProp();
          }
      break;
  }
  $('#rMenu').hide();
}

/**
 * edge关联连接的node对象
 * @param  {Object} jsonObj 数据对象
 * @return {Object}         关联node以后的数据对象
 */
function edgeAssociateNode(jsonObj) {
  jsonObj.edges.map(function(edge) { // 根据edge.source.id重新关联node对象
    var source = jsonObj.nodes.find(function(node) {
      return node.id === edge.source.id;
    });
    var target = jsonObj.nodes.find(function(node) {
      return node.id === edge.target.id;
    });
    edge.source = source;
    edge.target = target;
    return edge;
  });
  return jsonObj;
}


