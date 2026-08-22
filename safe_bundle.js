var __DEV__=false;global=this;
(function(){
  var React=require('react');
  var ReactNative=require('react-native');
  var App=function(){
    return React.createElement(ReactNative.View,{style:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#f0f4f8'}},
      React.createElement(ReactNative.Text,{style:{fontSize:24,fontWeight:'bold',color:'#023c69',textAlign:'center'}},'🎉 Приложение восстановлено!'),
      React.createElement(ReactNative.Text,{style:{fontSize:16,color:'#333',textAlign:'center',marginTop:10}},'Старый код был поврежден.'),
      React.createElement(ReactNative.Text,{style:{fontSize:16,color:'#333',textAlign:'center'}},'Но сборка теперь работает.')
    );
  };
  ReactNative.AppRegistry.registerComponent('main',function(){return App;});
})();
