$(document).ready(function() {
    const currentUser = JSON.parse(sessionStorage.getItem('user'));
    if (currentUser && currentUser.id) {
        window.location.href = '/chat.html';
    }
    
    $('#registerForm').validate({
        rules: {
            "confirm-password": {
                equalTo: '#txtPassword'
            }
        },
        messages: {
            "username": {
                required: "Vui lòng nhập tên đăng nhập",
                maxlength: "Tên đăng nhập tối đa 20 ký tự"
            },
            "display-name": {
                required: "Vui lòng nhập tên hiển thị",
                maxlength: "Tên hiển thị tối đa 50 ký tự"
            },
            "password": {
                required: "Vui lòng nhập mật khẩu",
                minlength: "Mật khẩu có ít nhất 8 ký tự"
            },
            "confirm-password": {
                required: "Vui lòng nhập lại mật khẩu",
                minlength: "Mật khẩu có ít nhất 8 ký tự",
                equalTo: "Nhập lại mật khẩu không đúng"
            }
        }
    });

    $('#registerForm').submit(function(event) {
        event.preventDefault();
        if ($('#registerForm').valid()) {
            var url = event.currentTarget.action;
            var data = $('#registerForm').serializeArray().reduce(function(obj, item) {
                obj[item.name] = item.value;
                return obj;
            }, {});
    
            axios({
                method: 'post',
                url,
                headers: {'Content-type': 'application/json'},
                data
            }).then(response => {
                if (response.data.error_code === 0) {
                    toastr.success(response.data.message);
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    toastr.error(response.data.message);
                    $('#form-message').text(response.data.message);
                    $('#form-message').css({display: 'block'});
                }
            }).catch(error => {
                console.log(error);
            });
        }
    });
});