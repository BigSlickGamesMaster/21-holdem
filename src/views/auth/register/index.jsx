// import { register } from 'query/login.query';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { register as registerAPI } from 'query/login.query';
import { Link, useNavigate } from 'react-router-dom';
import { ReactToastify } from 'shared/utils';
import { Col, Form, Row, Tooltip } from 'react-bootstrap';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import logo from '../../../assets/images/splash/logo.png';
import eye from '../../../assets/images/icons/eye_icon.svg';
import eye_slash_icon from '../../../assets/images/icons/eye_slash_icon.svg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
const Register = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { mutate } = useMutation(registerAPI, {
        onSuccess: (response) => {
            if (response.status === 200) {
                const devVerificationLink = response?.data?.data?.oDevMailPreview?.sLink;
                if (devVerificationLink) {
                    window.location.assign(devVerificationLink);
                    return;
                }

                ReactToastify('Email sent successfully', 'success');
                navigate('/login');
            } else {
                ReactToastify(response.data.message, 'error');
            }
        },
        onError: (error) => {
            console.error('Registration failed:', error);
            ReactToastify(error.response.data.message, 'error');
        },
    });

    const onSubmit = (formData) => {
        const payload = {
            sEmail: formData.email,
            sPassword: formData.password,
            sUserName: formData.username
        };

        mutate(payload);
    };

    return (
        <div className='sign-in-container'>
            <div className='login-container'>
                <div className="auth-container">
                    <Row>
                        <Col xl={6} lg={6} md={5} sm={12}>
                            <div className="auth-logo">
                                {/* <h3>Logo</h3> */}
                                <img src={logo} alt="logo" />
                            </div>
                        </Col>
                        <Col xl={6} lg={6} md={7} sm={12}>
                            <div className="auth-box">
                                <div className="auth-form-container">
                                    <h2 className="auth-title">REGISTER</h2>
                                    <div className='auth-form'>
                                        <form onSubmit={handleSubmit(onSubmit)} className="form">
                                            <div className="form-group">
                                                <label>Email ID</label>
                                                <Form.Control
                                                    type="email"
                                                    className={`form-control ${errors.email ? 'border border-danger' : ''}`}
                                                    placeholder="Enter Email ID"
                                                    isInvalid={!!errors.email}
                                                    {...register("email", {
                                                        required: "Email ID is required",
                                                        pattern: {
                                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                            message: "Invalid email address"
                                                        }
                                                    })}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label>Username</label>
                                                <Form.Control
                                                    type="text"
                                                    className={`form-control ${errors.username ? 'border border-danger' : ''}`}
                                                    placeholder="Enter Username"
                                                    isInvalid={!!errors.username}
                                                    {...register("username", {
                                                        required: "Username is required",
                                                        minLength: {
                                                            value: 4,
                                                            message: "Username must be at least 4 characters"
                                                        }
                                                    })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Password
                                                    <OverlayTrigger
                                                        placement='right'
                                                        overlay={
                                                            <Tooltip id="button-tooltip" className='register-tooltips'>
                                                                Password must be 8-16 characters with a mix of letters, numbers, and a special character.
                                                            </Tooltip>
                                                        }
                                                    >
                                                        <span className="ms-1">
                                                            <FontAwesomeIcon icon={faInfoCircle} />
                                                        </span>
                                                    </OverlayTrigger>
                                                </label>
                                                <div className="position-relative">
                                                    <Form.Control
                                                        type={showPassword ? "text" : "password"}
                                                        className={`form-control ${errors.password ? 'border border-danger' : ''}`}
                                                        placeholder="Enter Password"
                                                        isInvalid={!!errors.password}
                                                        {...register("password", {
                                                            required: "Password is required",
                                                            validate: (value) => {
                                                                const passwordPattern = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,16}$/;
                                                                if (!passwordPattern.test(value)) {
                                                                    ReactToastify('Password must be 8-16 characters with a mix of letters, numbers, and a special character.', 'error', 'password');
                                                                    return false;
                                                                }
                                                                return true;
                                                            },
                                                            minLength: {
                                                                value: 8,
                                                                message: "Password must be at least 8 characters"
                                                            },
                                                            maxLength: {
                                                                value: 16,
                                                                message: "Password must be less than 16 characters"
                                                            }
                                                        })}
                                                    />
                                                    <img src={showPassword ? eye : eye_slash_icon} alt="eye" className='eye-icon' onClick={() => setShowPassword(!showPassword)} />
                                                </div>
                                            </div>
                                            <div className="form-group d-flex justify-content-between align-items-center">
                                                <div className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        className={`form-check-input ${errors.terms ? 'border border-danger' : ''}`}
                                                        id="terms"
                                                        {...register("terms", { required: "You must accept Terms & Conditions and Privacy Policy" })}
                                                    />
                                                    <label className="form-check-label" htmlFor="terms">
                                                        I accept
                                                    </label>
                                                    {' '}
                                                    <a href="/terms-conditions" target="_blank" rel="noreferrer" className="btn btn-link p-0 align-baseline">
                                                        Terms & Conditions
                                                    </a>
                                                    {' '}and{' '}
                                                    <a href="/privacy-policy" target="_blank" rel="noreferrer" className="btn btn-link p-0 align-baseline">
                                                        Privacy Policy
                                                    </a>
                                                </div>
                                                {errors.terms ? <div className="text-danger small mt-1">{errors.terms.message}</div> : null}
                                                <div className='forgot-password'>
                                                    Already have an account? &nbsp;
                                                    <Link to="/login" className="">
                                                        Sign In
                                                    </Link>
                                                </div>
                                            </div>
                                            <button type="submit" className="btn btn-primary sign-in-btn">
                                                Register
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>
        </div>
    )
}

export default Register;
