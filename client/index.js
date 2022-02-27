$(document).ready(function() {
    const currentUser = JSON.parse(sessionStorage.getItem('user'));
    if (currentUser && currentUser.id) {
        window.location.href = '/chat.html';
    }
    
    $('#loginForm').validate({
        rules: {
            "username": {
                required: true,
                maxlength: 20
            },
            "password": {
                required: true,
                minlength: 8
            }
        },
        messages: {
            "username": {
                required: "Vui lòng nhập tên đăng nhập",
                maxlength: "Tên đăng nhập tối đa 20 ký tự"
            },
            "password": {
                required: "Vui lòng nhập mật khẩu",
                minlength: "Mật khẩu có ít nhất 8 ký tự"
            }
        }
    });

    $('#loginForm').submit(function(event) {
        event.preventDefault();
        if ($('#loginForm').valid()) {
            var url = event.currentTarget.action;
            var data = $('#loginForm').serializeArray().reduce(function(obj, item) {
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
                    sessionStorage.setItem('user', JSON.stringify(response.data.data));
                    setTimeout(() => {
                        window.location.href = '/chat.html';
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