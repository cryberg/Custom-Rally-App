Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
     items: [
        {
            xtype: 'container',
            itemId: 'exportBtn'
        },
        // {
        //     xtype: 'rallymilestonecombobox',
        //     itemId: 'milestoneCombobox'
        // },
        {
            xtype: 'container',
            itemId: 'gridContainer'
        }
    ],
    launch: function() {
        this._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Loading data..."});
        this._myMask.show();
        Ext.create('Rally.data.wsapi.Store',{
            model: 'UserStory',
            autoLoad: true,
            remoteSort: false,
            fetch:[
        	    "FormattedID", 
            	"Name", 
            	"TestCases", 
            	"Feature"
        	],
            limit: Infinity,
            listeners: {
                load: this._onDataLoaded,
                scope:this
            }
   	});
   },
   
   _onDataLoaded:function(store, data) {
     var stories = [],
            pendingTestCases = data.length;
        _.each(data, function(story) {
            var s = { 
            	Feature: story.get("Feature"), 
            	FormattedID: story.get("FormattedID"), 
            	Name: story.get("Name"), 
            	_ref: story.get("_ref"), 
            	TestCaseCount: story.get("TestCases").Count, 
            	TestCases: [] 
            };
            
            var testcases = story.getCollection("TestCases", { fetch: ["FormattedID"] });
            testcases.load({ 
            	callback: function(records, operation, success) { 
	            	_.each(records, function(testcase) { 
	            		s.TestCases.push({ 
	            			_ref: testcase.get("_ref"), 
	            			FormattedID: testcase.get("FormattedID"), 
	            			Name: testcase.get("Name") 
	            		}); 
	            	}, this);

	            	--pendingTestCases;
                    if (pendingTestCases === 0) {
                        this._makeGrid(stories);

                    }
                },
                scope: this
            });
            stories.push(s);
        }, this);
    },
    
    _makeGrid:function(stories){
        this._myMask.hide();
        var store = Ext.create('Rally.data.custom.Store', {
            data: stories  
        });
        this._stories = stories;
        this._grid = Ext.create('Rally.ui.grid.Grid',{
            itemId: 'storiesGrid',
            store: store,
            columnCfgs: [
            {
              text: "Feature",
              dataIndex: "Feature",
              renderer: function(value) {
                var html = [];
                return value ? '<a href="' + Rally.nav.Manager.getDetailUrl(value) + '">' + value.FormattedID + "</a>" : void 0;
              }
            }, { 
            	text: "Formatted ID", dataIndex: "FormattedID", xtype: "templatecolumn", 
            	tpl: Ext.create("Rally.ui.renderer.template.FormattedIDTemplate") 
            }, { 
            	text: "Name", dataIndex: "Name" 
            }, { 
            	text: "Test Case Count", dataIndex: "TestCaseCount", align: "center" 
            }, {
              text: "Test Cases", dataIndex: "TestCases", sortable: !1,
              renderer: function(value) {
                var html = [];
                Ext.Array.each(value, function(testcase) { 
                	html.push('<a href="' + Rally.nav.Manager.getDetailUrl(testcase) + '">' + testcase.FormattedID + "</a>");
                });
                return html.join("</br>");
              }
            }]
        });
        this.down('#gridContainer').add(this._grid);
         this.down('#exportBtn').add({
            xtype: 'rallybutton',
            text: 'Export to CSV',
            handler: this._onClickExport,
            scope: this
        });
    },
    _onClickExport:function(){
        var data = this._getCSV();
        window.location = 'data:text/csv;charset=utf8,' + encodeURIComponent(data);
    },
    
    _getCSV: function () {
        
        var cols    = this._grid.columns;
        var store   = this._grid.store;
        var data = '';

        
        _.each(cols, function(col, index) {
                data += this._getFieldTextAndEscape(col.text) + ',';
        },this);
        
        data += "\r\n";
        _.each(this._stories, function(record) {
            var featureData = record["Feature"];
            _.each(cols, function(col, index) {
                var text = '';
                var fieldName   = col.dataIndex;
                if (fieldName === "Feature" && featureData) {
                    text = featureData.FormattedID;
                } else if (fieldName === "TestCaseCount") {
                    text = record[fieldName].toString();
                } else if (fieldName === "TestCases"){
                    var textArr = [];
                    _.each(record[fieldName], function(testcase, index) {
                        textArr.push(testcase.FormattedID);
                    });
                    text = textArr.join(', ');
                } else{
                    text = record[fieldName];
                }
                
                data += this._getFieldTextAndEscape(text) + ',';

            },this);
            data += "\r\n";
        },this);

        return data;
    },
    _getFieldTextAndEscape: function(fieldData) {
        var string  = this._getFieldText(fieldData);  
        return this._escapeForCSV(string);
    },
    _getFieldText: function(fieldData) {
        var text;
        if (fieldData === null || fieldData === undefined || !fieldData.match) {
            text = '';
        } else if (fieldData._refObjectName) {
            text = fieldData._refObjectName;
        }else {
            text = fieldData;
        }

        return text;
    },
     _escapeForCSV: function(string) {
        if (string.match(/,/)) {
            if (!string.match(/"/)) {
                string = '"' + string + '"';
            } else {
                string = string.replace(/,/g, ''); 
            }
        }
        return string;
    }
});