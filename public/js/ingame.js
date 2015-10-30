$(document).ready(function(){
	$(".toggle_target").click(function(){
		if($(this).data("toggle") == "show"){
			$($(this).data('target')).hide();
			$(this).addClass($(this).data('addclass'));
			$(this).text($(this).data('showtext'));
			$(this).data("toggle", "hide");
			//hide
		}else{
			$($(this).data('target')).show();
			$(this).removeClass($(this).data('addclass'));
			$(this).text($(this).data('hidetext'));
			$(this).data("toggle", "show");
			//show
		}
	});
});